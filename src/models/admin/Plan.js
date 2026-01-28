const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  dayLimit: { type: Number, required: true },
  description: String,
  toggleButtons: {
    filterInclude: Boolean,
    audioVideo: Boolean,
    directChat: Boolean,
    chat: Boolean,
    likeMenu: Boolean
  },
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
