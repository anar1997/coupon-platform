// ✅ Güncellenmiş User.js (şifre sıfırlama token alanları eklendi)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' },

  // Şifre sıfırlama alanları
  resetToken: String,
  resetTokenExpires: Date,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.generateResetToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetToken = token;
  this.resetTokenExpires = Date.now() + 3600000; // 1 saat geçerli
  return token;
};

module.exports = mongoose.model('User', userSchema);