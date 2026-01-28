const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  giftTitle: { type: String},
  coin: {type: Number, required: true },
  imageUrl: String,
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('Gift', giftSchema);
