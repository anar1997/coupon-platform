//categoryRoutes.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const verifyAdmin = require('../middleware/verifyAdmin');
const verifyCustomer = require('../middleware/verifyCustomer');

// Kategori oluşturma - sadece admin
router.post('/', verifyAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Kategori zaten mevcut' });
    }
    const category = new Category({ name });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Kategori eklenemedi' });
  }
});

// Kategori listeleme - herkese açık ya da müşteriler için
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Kategoriler alınamadı' });
  }
});

module.exports = router;