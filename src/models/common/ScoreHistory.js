const mongoose = require('mongoose');

const scoreHistorySchema = new mongoose.Schema({
  femaleUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FemaleUser', 
    required: true 
  },
  ruleType: { 
    type: String, 
    required: true 
  },
  scoreAdded: { 
    type: Number, 
    required: true 
  },
  referenceDate: { 
    type: Date, 
    required: true 
  },
  ruleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdminRewardRule' 
  },
  addedBy: { 
    type: String, 
    default: 'system' 
  },
  note: { type: String }
}, { timestamps: true });

// Unique constraint to prevent duplicate scores for same user, ruleType, and date
// This ensures idempotency when using ruleType-based system
scoreHistorySchema.index({ femaleUserId: 1, ruleType: 1, referenceDate: 1 }, { unique: true });

// Indexes for efficient querying
scoreHistorySchema.index({ femaleUserId: 1, createdAt: -1 });
scoreHistorySchema.index({ referenceDate: 1 });
scoreHistorySchema.index({ activityType: 1 });

module.exports = mongoose.model('ScoreHistory', scoreHistorySchema);