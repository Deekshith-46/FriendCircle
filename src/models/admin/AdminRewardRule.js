const mongoose = require('mongoose');

const adminRewardRuleSchema = new mongoose.Schema({
  ruleType: {
    type: String,
    enum: [
      "DAILY_LOGIN",
      "DAILY_AUDIO_CALL_TARGET",
      "DAILY_VIDEO_CALL_TARGET",
      "WEEKLY_CONSISTENCY"
    ],
    required: true
  },
  scoreValue: { type: Number, required: true },
  minCount: {
    type: Number, // used for audio/video call rules
    default: null
  },
  requiredDays: {
    type: Number, // used only for weekly consistency
    default: 7
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  }
}, { timestamps: true });

// Indexes for efficient querying
adminRewardRuleSchema.index({ ruleType: 1 });
adminRewardRuleSchema.index({ isActive: 1 });

module.exports = mongoose.model('AdminRewardRule', adminRewardRuleSchema);