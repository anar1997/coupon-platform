//verifySeller.js
const jwt = require('jsonwebtoken');

const verifySeller = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Yetki yok' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'seller') throw new Error('Satıcı değil');
    // 🔥 Güncelleme: req.user içinde userId ve role standart formatta
    req.user = { userId: decoded.sellerId || decoded.userId, role: 'seller', email: decoded.email };
    next();
  } catch {
    res.status(403).json({ message: 'Geçersiz token veya satıcı değil' });
  }
};

module.exports = verifySeller;