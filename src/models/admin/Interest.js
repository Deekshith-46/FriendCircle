const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: String, // Cloudinary image
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('Interest', interestSchema);
