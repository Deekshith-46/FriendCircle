const mongoose = require('mongoose');

const levelConfigSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    unique: true,
    min: 0
  },
  weeklyEarningsMin: {
    type: Number,
    required: true,
    min: 0
  },
  weeklyEarningsMax: {
    type: Number,
    required: true,
    min: 0
  },
  audioRatePerMinute: {
    type: Number,
    required: true,
    min: 0
  },
  videoRatePerMinute: {
    type: Number,
    required: true,
    min: 0
  },
  platformMarginPerMinute: {
    nonAgency: {
      type: Number,
      required: true,
      min: 0
    },
    agency: {
      type: Number,
      required: true,
      min: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient querying by earnings range
levelConfigSchema.index({ weeklyEarningsMin: 1, weeklyEarningsMax: 1 });

module.exports = mongoose.model('AdminLevelConfig', levelConfigSchema);