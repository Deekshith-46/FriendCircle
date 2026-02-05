const mongoose = require('mongoose');

const femaleUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true, unique: true },
  otp: { 
    type: Number,
    required: function() {
      return !this.isVerified;
    }
  }, // OTP for verification
  name: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['female', 'male'] },
  bio: { type: String },
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleImage' }],
  videoUrl: String, // URL for the 10-second live video
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
  // New fields for manually entered preferences (stored as {id, name})
  hobbies: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  sports: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  film: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  music: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  travel: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  reviewStatus: { type: String, enum: ['completeProfile', 'pending', 'accepted', 'rejected'], default: 'completeProfile' },
  rejectionReason: { type: String }, // Reason for rejection when reviewStatus is 'rejected'
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false }, // Only true after OTP verification
  profileCompleted: { type: Boolean, default: false }, // True only after user completes profile with all details
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser' }],

  kycStatus: { type: String, enum: ['completeKyc', 'pending', 'accepted', 'rejected'], default: 'completeKyc' },
  kycDetails: { 
    bank: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      accountNumber: String,
      ifsc: String,
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
      verifiedAt: Date
    },
    upi: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      upiId: String,
      status: { type: String, enum: ['pending', 'rejected', 'accepted'], default: 'pending' },
      verifiedAt: Date
    }
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleFollowers' }], // Fixed: should reference FemaleFollowers, not MaleUser
  femalefollowing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleFollowing' }], // Fixed: should reference FemaleFollowing
  earnings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Earnings' }],
  blockList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  beautyFilter: { type: Boolean, default: false },
  hideAge: { type: Boolean, default: false },
  onlineStatus: { type: Boolean, default: false },
  onlineStartTime: { type: Date },
  totalOnlineMinutes: { type: Number, default: 0 },
  missedCalls: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  coinBalance: { type: Number, default: 0 },
  // Level-based call rate system
  currentLevel: { type: Number, default: 0 }, // Current level based on weekly earnings (0 = starter level)
  audioCoinsPerMinute: { type: Number, default: 0 }, // Audio call rate per minute (set by level config)
  videoCoinsPerMinute: { type: Number, default: 0 }, // Video call rate per minute (set by level config)
  weeklyEarnings: { type: Number, default: 0 }, // Current week's earnings for level calculation
  lastLevelEvaluatedAt: { type: Date }, // Last time the user's level was evaluated by cron job
  // Location fields
  latitude: { type: Number },
  longitude: { type: Number },
  locationUpdatedAt: { type: Date },
  // Referral system
  referralCode: { type: String, unique: true, sparse: true },
  referredByFemale: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  referredByAgency: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AgencyUser',
    default: null 
  },
  
  // Score system
  score: { type: Number, default: 0 },        // totalScore (lifetime)
  dailyScore: { type: Number, default: 0 },   // resets daily
  weeklyScore: { type: Number, default: 0 },  // resets weekly
  
  // Activity tracking for scoring
  lastActiveDate: { type: Date },
  consecutiveActiveDays: { type: Number, default: 0 },
  
  // Push Notification FCM Tokens (support multiple devices)
  fcmTokens: [{
    token: { type: String, required: true },
    deviceId: { type: String }, // Optional device identifier
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('FemaleUser', femaleUserSchema);