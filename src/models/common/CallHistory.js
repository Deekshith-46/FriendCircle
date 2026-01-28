const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  // Caller (Male User)
  callerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MaleUser', 
    required: true 
  },
  callerType: { 
    type: String, 
    default: 'male',
    enum: ['male'] 
  },
  
  // Receiver (Female User)
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FemaleUser', 
    required: true 
  },
  receiverType: { 
    type: String, 
    default: 'female',
    enum: ['female'] 
  },
  
  // Call Details
  duration: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Actual duration in seconds
  billableDuration: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Billable duration in seconds (with minimum applied)
  
  // Coin Details - Updated for new architecture
  femaleEarningPerMinute: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Rate that female gets per minute (source of truth)
  platformMarginPerMinute: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Platform margin per minute (source of truth)
  femaleEarningPerSecond: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Rate that female gets per second (calculated at runtime)
  platformMarginPerSecond: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Platform margin per second (calculated at runtime)
  totalCoins: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Total coins male paid (female earning + platform margin)
  femaleEarning: { // Total coins female earned
    type: Number,
    required: true,
    min: 0
  },
  platformMargin: { // Total platform margin
    type: Number,
    required: true,
    min: 0
  },
  adminEarned: { // Total admin commission from platform margin
    type: Number,
    required: true,
    min: 0
  },
  agencyEarned: { // Total agency commission from platform margin
    type: Number,
    required: true,
    min: 0
  },
  // Snapshot of admin configuration at call time (for audit trail)
  adminSharePercentage: { // Admin share % at call end time
    type: Number,
    min: 0,
    max: 100
  },
  agencySharePercentage: { // Agency share % at call end time
    type: Number,
    min: 0,
    max: 100
  },
  isAgencyFemale: { // Flag to identify if the female belongs to an agency
    type: Boolean,
    required: true,
    default: false
  },
  
  // Call Type
  callType: { 
    type: String, 
    enum: ['audio', 'video'], 
    default: 'video' 
  },
  
  // Call Status
  status: { 
    type: String, 
    enum: ['completed', 'failed', 'insufficient_coins'], 
    default: 'completed' 
  },
  
  // Additional Info
  errorMessage: { type: String },
  
  // Rating Fields
  rating: {
    stars: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    message: {
      type: String,
      default: null
    },
    ratedBy: {
      type: String,
      enum: ['female'],
      default: null
    },
    ratedAt: {
      type: Date,
      default: null
    }
  }
  
}, { timestamps: true });

// Indexes for efficient queries
callHistorySchema.index({ callerId: 1, createdAt: -1 });
callHistorySchema.index({ receiverId: 1, createdAt: -1 });
callHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('CallHistory', callHistorySchema);
