const mongoose = require('mongoose');

const giftReceivedSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift' },
  giftTitle: { type: String },
  coinsSpent: { type: Number, required: true },
  message: { type: String },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('GiftReceived', giftReceivedSchema);