// /models/user/Reward.js
const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' },
  earnings: { type: Number, required: true },
  rewardDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
