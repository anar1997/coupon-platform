//verifyAdmin.js
require('dotenv').config(); // .env dosyasını yükle
const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Yetkisiz' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // fallback kaldırıldı

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Sadece admin erişebilir' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT doğrulama hatası:', error.message); // Debug için log
    res.status(401).json({ message: 'Geçersiz token' });
  }
};

module.exports = verifyAdmin;