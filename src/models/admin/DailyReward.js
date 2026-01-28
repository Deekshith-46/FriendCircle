const mongoose = require('mongoose');

const dailyRewardSchema = new mongoose.Schema({
  minWalletBalance: { type: Number, required: true },
  rewardAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('DailyReward', dailyRewardSchema);