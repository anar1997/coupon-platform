// scripts/seedAdmin.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB bağlı'))
  .catch(err => console.error('Bağlantı hatası:', err));

const seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin zaten var');
      return process.exit();
    }

    const newAdmin = new User({
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

    await newAdmin.save();
    console.log('✅ Admin başarıyla eklendi');
    process.exit();
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
};

seedAdmin();