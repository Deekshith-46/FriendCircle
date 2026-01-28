const mongoose = require('mongoose');

const blockListSchema = new mongoose.Schema({
  maleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  dateBlocked: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MaleBlockList', blockListSchema);
