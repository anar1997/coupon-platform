// utils/sendEmail.js

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const sendEmail = async (to, subject, text) => {
  // SMTP ayarları (Gmail örneği)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Kupon Platformu" <${process.env.EMAIL_USER}>`, // ✅ DÜZELTİLDİ
    to,       // Alıcı mail adresi
    subject,  // Konu
    text      // İçerik
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
