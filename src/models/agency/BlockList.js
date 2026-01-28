const mongoose = require('mongoose');

const agencyBlockListSchema = new mongoose.Schema({
  agencyUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgencyUser',
    required: true
  },
  blockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FemaleUser',
    required: true
  },
  blockedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure that a user can't block the same user twice
agencyBlockListSchema.index({ agencyUserId: 1, blockedUserId: 1 }, { unique: true });

module.exports = mongoose.model('AgencyBlockList', agencyBlockListSchema);