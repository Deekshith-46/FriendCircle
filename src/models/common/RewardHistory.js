const mongoose = require('mongoose');

const rewardHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  type: { type: String, enum: ['daily', 'weekly'], required: true },
  rewardAmount: { type: Number, required: true },
  status: { type: String, enum: ['approved', 'rejected'], required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  note: { type: String },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('RewardHistory', rewardHistorySchema);