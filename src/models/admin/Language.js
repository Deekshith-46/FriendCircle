const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: String,
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('Language', languageSchema);
