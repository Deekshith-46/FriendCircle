const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema({
  // Call identification
  callId: { 
    type: String, 
    required: true, 
    unique: true // Generated call session ID
  },
  
  // Users
  callerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MaleUser', 
    required: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FemaleUser', 
    required: true 
  },
  
  // Rate snapshot (frozen at call start)
  femaleRatePerSecond: { 
    type: Number, 
    required: true,
    min: 0
  },
  platformRatePerSecond: { 
    type: Number, 
    required: true,
    min: 0
  },
  malePayPerSecond: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Context snapshot
  callType: { 
    type: String, 
    enum: ['audio', 'video'], 
    required: true
  },
  receiverLevel: { 
    type: Number, 
    required: true
  },
  isAgencyFemale: { 
    type: Boolean, 
    required: true
  },
  
  // Rate context (per-minute for reference)
  femaleRatePerMinute: { 
    type: Number, 
    required: true,
    min: 0
  },
  platformMarginPerMinute: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Session metadata
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    required: true // TTL index will auto-delete expired sessions
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// TTL index for auto cleanup of expired sessions
callSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for efficient queries
callSessionSchema.index({ callId: 1 });
callSessionSchema.index({ callerId: 1, isActive: 1 });
callSessionSchema.index({ receiverId: 1, isActive: 1 });
callSessionSchema.index({ createdAt: -1 });

// Partial unique index to prevent duplicate active sessions per caller
callSessionSchema.index(
  { callerId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model('CallSession', callSessionSchema);