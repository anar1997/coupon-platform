// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const couponRoutes = require('./routes/couponRoutes');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // ✅ yeni kategori rotası
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// API Rotaları
app.use('/api/coupons', couponRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes); // ✅ kategori rotası eklendi

// Merkezi hata yakalayıcı middleware
app.use(errorHandler);

// MongoDB bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB bağlantısı başarılı');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Sunucu çalışıyor: http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.error('DB bağlantı hatası:', err));
