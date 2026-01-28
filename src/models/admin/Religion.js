const mongoose = require('mongoose');

const religionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('Religion', religionSchema);
