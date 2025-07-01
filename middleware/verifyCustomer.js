//verifyCustomer.js
const jwt = require('jsonwebtoken');

const verifyCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Yetkisiz (token eksik)' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'customer') {
      return res.status(403).json({ message: 'Sadece müşteri erişebilir' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token doğrulama hatası:', error.message); // << Log eklendi
    res.status(401).json({ message: 'Geçersiz token' });
  }
};

module.exports = verifyCustomer;