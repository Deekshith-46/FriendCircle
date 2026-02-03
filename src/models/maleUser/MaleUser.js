const mongoose = require('mongoose');

const maleUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String},
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String },
  password: { type: String, required: true },
  bio: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
  // New fields for manually entered preferences (as objects with id and name)
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
  relationshipGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RelationGoal' }],
  religion: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
  height: { type: String },
  // searchPreferences: { type: String, enum: ['male', 'female', 'both'], default: 'female' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  malefollowing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleFollowing' }],
  malefollowers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleFollowers' }], // Added missing followers array
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleImage' }], // Array of image references
  // balance: { type: Number, default: 0 }, // Deprecated: legacy combined balance
  walletBalance: { type: Number, default: 0 },
  coinBalance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false }, // Only true after OTP verification
  otp: { type: Number }, // OTP for verification
  profileCompleted: { type: Boolean, default: false }, // Track if user has completed profile
  reviewStatus: { type: String, enum: ['completeProfile', 'pending', 'accepted', 'rejected'], default: 'completeProfile' }, // Status for profile review - starts as completeProfile after signup
  // Location fields
  latitude: { type: Number },
  longitude: { type: Number },
  locationUpdatedAt: { type: Date },
  // Referral system
  referralCode: { type: String, unique: true, sparse: true }, // 8-char alphanumeric
  referredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser' }], 
}, { timestamps: true });

module.exports = mongoose.model('MaleUser', maleUserSchema);
