const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const sendEmail = require('../utils/sendEmail');
const verifyAdmin = require('../middleware/verifyAdmin');
const verifyCustomer = require('../middleware/verifyCustomer');
const verifySeller = require('../middleware/verifySeller');
const jwt = require('jsonwebtoken'); // <<< EKLENDİ - jwt import edildi

// Tüm kuponları getir (Admin/Satıcı için tüm kuponları döndürebiliriz)
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find().populate('category').sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Kuponlar alınamadı' });
  }
});

// Müşteri ve Satıcı için kendi kuponlarını getiren endpoint
router.get('/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Yetkisiz (token eksik)' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const email = decoded.email;
    const role = decoded.role;

    if (role === 'customer') {
      const allCoupons = await Coupon.find({ buyerEmail: email }).sort({ createdAt: -1 });

      const usedCoupons = [];
      const activeCoupons = [];
      const expiredUnusedCoupons = [];

      let totalSpent = 0;
      let totalSaved = 0;

      const now = new Date();

      for (const coupon of allCoupons) {
        totalSpent += coupon.price || 0;

        if (coupon.usedAt) {
          usedCoupons.push(coupon);
          if (coupon.discountType === 'percentage') {
            totalSaved += ((coupon.discount / 100) * coupon.price) || 0;
          } else {
            totalSaved += coupon.discount || 0;
          }
        } else {
          if (coupon.expiresAt && coupon.expiresAt < now) {
            expiredUnusedCoupons.push(coupon);
          } else {
            activeCoupons.push(coupon);
          }
        }
      }

      const passiveCoupons = [...usedCoupons, ...expiredUnusedCoupons];

      return res.json({
        stats: {
          totalCoupons: allCoupons.length,
          totalSpent,
          totalSaved,
        },
        activeCoupons,
        passiveCoupons,
        allCoupons,
      });
    } else {
      return res.status(403).json({ message: 'Erişim reddedildi' });
    }
  } catch (err) {
    console.error('Kuponlar alınamadı:', err);
    res.status(500).json({ message: 'Kuponlar alınamadı' });
  }
});

// Admin yeni kupon oluşturur
router.post('/create', verifyAdmin, async (req, res) => {
  try {
    const { title, description, discount, discountType, price, category, expiresAt } = req.body;
    const coupon = new Coupon({ title, description, discount, discountType, price, category, expiresAt });
    await coupon.save();
    res.status(201).json({ message: 'Kupon oluşturuldu', coupon });
  } catch (error) {
    res.status(500).json({ message: 'Kupon oluşturulamadı' });
  }
});

// Giriş yapmış müşteri kupon alır
router.post('/buy/:id', verifyCustomer, async (req, res) => {
  try {
    const couponId = req.params.id;
    const email = req.user.email;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) return res.status(404).json({ message: 'Kupon bulunamadı' });
    if (coupon.isUsed) return res.status(400).json({ message: 'Bu kupon zaten satıldı' });

    const uniqueCode = 'KUPON-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    coupon.code = uniqueCode;
    coupon.isUsed = true;
    coupon.buyerEmail = email;
    coupon.usedAt = null;
    // coupon.expiresAt güncellemesi kaldırıldı
    await coupon.save();

    await sendEmail(email, 'Kupon Kodunuz', `Təbriklər! Kupon kodunuz: ${uniqueCode}`);
    res.json({ message: 'Kupon satın alındı ve e-posta gönderildi', code: uniqueCode });
  } catch (error) {
    console.error('Satın alma hatası:', error);
    res.status(500).json({ message: 'Bir hata oluştu' });
  }
});

// Giriş yapmadan kupon al (e-posta zorunlu)
router.post('/public-buy/:id', async (req, res) => {
  try {
    const couponId = req.params.id;
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: 'E-posta adresi gerekli' });

    const coupon = await Coupon.findById(couponId);
    if (!coupon) return res.status(404).json({ message: 'Kupon bulunamadı' });
    if (coupon.isUsed) return res.status(400).json({ message: 'Bu kupon zaten satıldı' });

    const uniqueCode = 'KUPON-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    coupon.code = uniqueCode;
    coupon.isUsed = true;
    coupon.buyerEmail = email;
    coupon.usedAt = null;
    // coupon.expiresAt güncellemesi kaldırıldı
    await coupon.save();

    await sendEmail(email, 'Kupon Kodunuz', `Təbriklər! Kupon kodunuz: ${uniqueCode}`);
    res.json({ message: 'Kupon başarıyla alındı ve e-posta gönderildi', code: uniqueCode });
  } catch (error) {
    console.error('Anonim satın alma hatası:', error);
    res.status(500).json({ message: 'Bir hata oluştu' });
  }
});

// Kupon sil
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Kupon bulunamadı' });
    res.json({ message: 'Kupon başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Kupon silinirken hata oluştu' });
  }
});

// Satıcının kuponu tarayıp işaretlemesi
router.post('/use-coupon/:code', verifySeller, async (req, res) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.status(404).json({ message: 'Kupon bulunamadı' });
    if (coupon.usedAt) return res.status(400).json({ message: 'Kupon zaten kullanılmış' });

    coupon.usedAt = new Date();
    coupon.usedBy = req.user.userId;
    coupon.usedByRole = req.user.role;
    await coupon.save();

    res.json({ message: 'Kupon başarıyla kullanıldı', coupon });
  } catch (err) {
    console.error('Kupon kullanım hatası:', err);
    res.status(500).json({ message: 'Kupon işaretlenemedi' });
  }
});

// Satıcının taradığı kuponları getir
router.get('/used-by-seller', verifySeller, async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const usedCoupons = await Coupon.find({ usedBy: sellerId }).sort({ usedAt: -1 });
    res.json({ usedCoupons });
  } catch (err) {
    console.error('Satıcının kuponları alınamadı:', err);
    res.status(500).json({ message: 'Kuponlar alınamadı' });
  }
});

// Yeni endpoint: ID ile kupon detayı, category ile birlikte dönüyor // ✅ eklendi
router.get('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).populate('category');
    if (!coupon) return res.status(404).json({ message: 'Kupon bulunamadı' });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Kupon alınamadı' });
  }
});

module.exports = router;
