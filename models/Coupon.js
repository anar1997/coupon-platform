//Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  title: String,
  description: String,
  discount: Number,
  discountType: { // ✅ Eklendi: 'percentage' veya 'fixed'
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'fixed'
  },
  price: Number,
  code: String,
  isUsed: {
    type: Boolean,
    default: false
  },
  buyerEmail: String,
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usedByRole: String, // ✅ Kim kullandı? seller/customer/admin vs.
  usedAt: Date,
  expiresAt: Date,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);