const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' },
  message: { type: String },
  media: { type: String }, // Link to media (image/video)
  isVoiceNote: { type: Boolean, default: false },
  isDisappearing: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('maleChat', chatSchema);
