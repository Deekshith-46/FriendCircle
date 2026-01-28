const mongoose = require('mongoose');

const pendingRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  type: { type: String, enum: ['daily', 'weekly'], required: true },
  earningValue: { type: Number, required: true },
  rewardAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PendingReward', pendingRewardSchema);