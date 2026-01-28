// /models/user/Earnings.js
const mongoose = require('mongoose');

const earningsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' },
  amount: { type: Number, required: true },
  source: { type: String }, // Source of earnings, e.g., rewards, referrals
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Earnings', earningsSchema);
