// /models/user/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String },  // Text message
  media: { type: String },    // Media URL (image, video, voice note)
  isVoiceNote: { type: Boolean, default: false }, // Voice message indicator
  isDisappearing: { type: Boolean, default: false }, // Disappearing message
  sentAt: { type: Date, default: Date.now } // Timestamp of when message was sent
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
