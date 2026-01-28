// /models/femaleUser/BlockList.js
const mongoose = require('mongoose');

const blockListSchema = new mongoose.Schema({
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  dateBlocked: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FemaleBlockList', blockListSchema);
