// /models/user/Invite.js
const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' },
  inviteCode: { type: String, required: true, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateInvited: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Invite', inviteSchema);
