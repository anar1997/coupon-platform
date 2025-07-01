//authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Coupon = require('../models/Coupon'); // ✅ Kuponları bağlamak için eklendi
const Seller = require('../models/Seller');
const bcrypt = require('bcryptjs'); 
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// 🔐 Token oluştur
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, role: 'admin' });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Geçersiz bilgiler' });
    }
    res.json({ token: generateToken(user) });
  } catch (error) {
    res.status(500).json({ message: 'Giriş başarısız' });
  }
});

// ✅ Müşteri kaydı
router.post('/customer-register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı' });

    const newUser = new User({ email, password, role: 'customer' });
    await newUser.save();

    // ✅ Bu e-postayla daha önce alınmış kuponları kullanıcıya bağla
    await Coupon.updateMany(
      { buyerEmail: email },
      { $set: { usedBy: newUser._id } }
    );

    res.status(201).json({ token: generateToken(newUser) });
  } catch (error) {
    res.status(500).json({ message: 'Kayıt başarısız' });
  }
});

// ✅ Müşteri login
router.post('/customer-login', async (req, res) => {
  const { email, password } = req.body;
  console.log('📩 Giriş isteği:', { email, password });

  try {
    const user = await User.findOne({ email, role: 'customer' });
    if (!user) {
      console.log('🚫 Kullanıcı bulunamadı');
      return res.status(400).json({ message: 'Kullanıcı bulunamadı' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('🔑 Şifre uyuşmadı');
      return res.status(400).json({ message: 'Şifre yanlış' });
    }

    console.log('✅ Giriş başarılı');
    res.json({ token: generateToken(user) });
  } catch (error) {
    console.error('💥 Giriş hatası:', error);
    res.status(500).json({ message: 'Giriş başarısız' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const token = user.generateResetToken();
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const message = `Parolanızı sıfırlamak için aşağıdaki bağlantıya tıklayın:\n\n${resetUrl}`;

    await sendEmail(email, 'Şifre Sıfırlama', message);
    res.json({ message: 'Şifre sıfırlama e-postası gönderildi' });
  } catch (err) {
    res.status(500).json({ message: 'İşlem sırasında hata oluştu' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Token geçersiz veya süresi dolmuş' });

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Şifre başarıyla sıfırlandı' });
  } catch (err) {
    res.status(500).json({ message: 'Şifre sıfırlanamadı' });
  }
});


// Seller register
router.post('/seller-register', async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await Seller.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Satıcı zaten kayıtlı' });

  const hashed = await bcrypt.hash(password, 10);
  const seller = new Seller({ name, email, password: hashed });
  await seller.save();

  res.json({ message: 'Satıcı kaydı başarılı' });
});

// Seller login
router.post('/seller-login', async (req, res) => {
  const { email, password } = req.body;
  const seller = await Seller.findOne({ email });
  if (!seller) return res.status(400).json({ message: 'Satıcı bulunamadı' });

  const valid = await bcrypt.compare(password, seller.password);
  if (!valid) return res.status(400).json({ message: 'Şifre yanlış' });

  const token = jwt.sign({ sellerId: seller._id, role: 'seller', email }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});


module.exports = router;