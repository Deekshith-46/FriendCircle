const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema({
  minCallCoins: { 
    type: Number, 
    default: null,
    min: 0
  }, // Fallback minimum coins (now primarily using minimum billable duration logic)
  adminSharePercentage: { // Percentage of platform margin that goes to admin
    type: Number,
    default: null, // Must be explicitly set by admin
    min: 0, // Allow 0% for testing purposes
    max: 100
  },
  // Withdrawal settings
  coinToRupeeConversionRate: {
    type: Number,
    default: null, // Must be explicitly set by admin
    min: 0
  },
  minWithdrawalAmount: {
    type: Number,
    default: null, // Must be explicitly set by admin
    min: 0
  },
  femaleReferralBonus: {
    type: Number,
    default: 100   // coins
  },
  agencyReferralBonus: {
    type: Number,
    default: 0     // coins
  },
  maleReferralBonus: {
    type: Number,
    default: 100   // coins
  },
  // Nearby distance settings
  nearbyDistanceValue: { 
    type: Number, 
    default: 5, // Default 5 km
    min: 0
  },
  nearbyDistanceUnit: { 
    type: String, 
    default: 'km', // km or meters
    enum: ['m', 'km']
  },
  // New user window settings
  newUserWindowDays: { 
    type: Number, 
    default: 7, // Default 7 days for new users
    min: 1,
    max: 365
  },
  // Other global settings can be added here in the future
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure only one config document exists
adminConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('AdminConfig', adminConfigSchema);