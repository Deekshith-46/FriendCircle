const mongoose = require('mongoose');

const weeklyRewardSchema = new mongoose.Schema({
  rank: { type: Number, required: true, unique: true },
  rewardAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('WeeklyReward', weeklyRewardSchema);