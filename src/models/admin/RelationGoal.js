const mongoose = require('mongoose');

const relationGoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subTitle: String,
  status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

module.exports = mongoose.model('RelationGoal', relationGoalSchema);
