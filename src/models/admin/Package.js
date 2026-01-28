const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  coin: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
