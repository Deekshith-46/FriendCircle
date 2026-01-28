# Complete CALL SYSTEM Documentation

This document provides comprehensive details about the call system in the Friend Circle application, including schemas, routes, controllers, and code implementation.

## Table of Contents
1. [System Overview](#system-overview)
2. [Schemas](#schemas)
   - [CallHistory Schema](#callhistory-schema)
   - [User Schemas](#user-schemas)
   - [AdminConfig Schema](#adminconfig-schema)
3. [Controllers](#controllers)
   - [Male User Call Controller](#male-user-call-controller)
   - [Female User Call Earnings Controller](#female-user-call-earnings-controller)
4. [Routes](#routes)
   - [Male User Call Routes](#male-user-call-routes)
   - [Female User Call Routes](#female-user-call-routes)
5. [Call Flow](#call-flow)
6. [Error Messages](#error-messages)
7. [Configuration](#configuration)

## System Overview

The call system in Friend Circle allows male users to make audio/video calls to female users. The system implements a coin-based payment model where:

- Male users pay coins per second of call duration
- Female users receive coins as earnings which are credited to their wallet balance
- A minimum coin requirement must be met to start a call
- Users must follow each other to initiate a call
- Users cannot call if they have blocked each other

## Schemas

### CallHistory Schema

The CallHistory schema stores records of all calls made between users.

```javascript
// File: src/models/common/CallHistory.js
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
  }, // Duration in seconds

  // Coin Details
  coinsPerSecond: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Rate at the time of call
  totalCoins: { 
    type: Number, 
    required: true,
    min: 0 
  }, // Total coins deducted/credited

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

}, { timestamps: true });

// Indexes for efficient queries
callHistorySchema.index({ callerId: 1, createdAt: -1 });
callHistorySchema.index({ receiverId: 1, createdAt: -1 });
callHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('CallHistory', callHistorySchema);
```

### User Schemas

#### FemaleUser Schema

The FemaleUser schema contains call-related fields including coins per second rate and wallet balance.

```javascript
// File: src/models/femaleUser/FemaleUser.js
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
  walletBalance: { type: Number, default: 0 }, // Earnings from calls are credited here
  coinBalance: { type: Number, default: 0 },
  // Call rate system
  coinsPerSecond: { type: Number, default: 2 }, // Admin-configurable rate for video/audio calls
  // Referral system
  referralCode: { type: String, unique: true, sparse: true },
  referredByFemale: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  referredByAgency: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgencyUser' ]},
}, { timestamps: true });

module.exports = mongoose.model('FemaleUser', femaleUserSchema);
```

#### MaleUser Schema

The MaleUser schema contains coin balance for making calls.

```javascript
// File: src/models/maleUser/MaleUser.js
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
  // New fields for manually entered preferences
  hobbies: [{ type: String }],
  sports: [{ type: String }],
  film: [{ type: String }],
  music: [{ type: String }],
  travel: [{ type: String }],
  relationshipGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RelationshipGoal' }],
  religion: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
  height: { type: String },
  searchPreferences: { type: String, enum: ['male', 'female', 'both'], default: 'female' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  malefollowing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleFollowing' }],
  malefollowers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleFollowers' }], // Added missing followers array
  images: [String], // Array of image URLs
  balance: { type: Number, default: 0 }, // Deprecated: legacy combined balance
  walletBalance: { type: Number, default: 0 },
  coinBalance: { type: Number, default: 0 }, // Coins to spend on calls
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false }, // Only true after OTP verification
  otp: { type: Number }, // OTP for verification
  profileCompleted: { type: Boolean, default: false }, // Track if user has completed profile
  // Referral system
  referralCode: { type: String, unique: true, sparse: true }, // 8-char alphanumeric
  referredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser' }], 
}, { timestamps: true });

module.exports = mongoose.model('MaleUser', maleUserSchema);
```

### AdminConfig Schema

The AdminConfig schema contains call-related configuration settings.

```javascript
// File: src/models/admin/AdminConfig.js
const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema({
  minCallCoins: { 
    type: Number, 
    default: 60,
    min: 0
  },
  // Withdrawal settings
  coinToRupeeConversionRate: {
    type: Number,
    default: 10, // 10 coins = 1 Rupee
    min: 0
  },
  minWithdrawalAmount: {
    type: Number,
    default: 500, // Minimum withdrawal amount in Rupees
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
```

## Controllers

### Male User Call Controller

The call controller handles all call-related functionality for male users.

```javascript
// File: src/controllers/maleUserControllers/callController.js
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const CallHistory = require('../../models/common/CallHistory');
const Transaction = require('../../models/common/Transaction');
const AdminConfig = require('../../models/admin/AdminConfig');
const MaleFollowing = require('../../models/maleUser/Following');
const FemaleFollowing = require('../../models/femaleUser/Following');
const messages = require('../../validations/messages');

// Start Call - Check minimum coins requirement and calculate max duration
exports.startCall = async (req, res) => {
  const { receiverId, callType } = req.body;
  const callerId = req.user._id; // Authenticated male user

  try {
    // Validate input
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.RECEIVER_REQUIRED
      });
    }

    // Get caller (male user) and receiver (female user)
    const caller = await MaleUser.findById(callerId);
    const receiver = await FemaleUser.findById(receiverId);

    if (!caller) {
      return res.status(404).json({
        success: false,
        message: messages.CALL.CALLER_NOT_FOUND
      });
    }

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: messages.CALL.RECEIVER_NOT_FOUND
      });
    }

    // Check if users follow each other (they are matched)
    // We need to check the actual following collections, not just the arrays in user documents
    const isCallerFollowing = await MaleFollowing.findOne({ 
      maleUserId: callerId, 
      femaleUserId: receiverId 
    });
    
    const isReceiverFollowing = await FemaleFollowing.findOne({ 
      femaleUserId: receiverId, 
      maleUserId: callerId 
    });
    
    if (!isCallerFollowing || !isReceiverFollowing) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.FOLLOW_EACH_OTHER
      });
    }

    // Check block list (no blocking between them)
    const isCallerBlocked = receiver.blockList && receiver.blockList.includes(callerId);
    const isReceiverBlocked = caller.blockList && caller.blockList.includes(receiverId);
    
    if (isCallerBlocked || isReceiverBlocked) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.BLOCKED_CANNOT_CALL
      });
    }

    // Get the per-second rate from female user
    const coinsPerSecond = receiver.coinsPerSecond || 2; // Default 2 if not set
    
    // Get minimum call coins setting from admin config
    const adminConfig = await AdminConfig.getConfig();
    const minCallCoins = adminConfig.minCallCoins || 60; // Default 60 if not set

    // Check minimum balance requirement
    if (caller.coinBalance < minCallCoins) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.MIN_COINS_REQUIRED(minCallCoins),
        data: {
          available: caller.coinBalance,
          required: minCallCoins,
          shortfall: minCallCoins - caller.coinBalance
        }
      });
    }

    // Calculate maximum possible seconds
    const maxSeconds = Math.floor(caller.coinBalance / coinsPerSecond);

    // Check if user has enough coins for at least 1 second
    if (maxSeconds <= 0) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.NOT_ENOUGH_COINS,
        data: {
          available: caller.coinBalance,
          rate: coinsPerSecond,
          maxSeconds: 0
        }
      });
    }

    // Return success response with maxSeconds for frontend timer
    return res.json({
      success: true,
      message: messages.CALL.CALL_CAN_START,
      data: {
        maxSeconds,
        coinsPerSecond,
        callerCoinBalance: caller.coinBalance,
        minCallCoins
      }
    });

  } catch (err) {
    console.error('Error starting call:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// End Call - Calculate coins, deduct from male, credit to female
exports.endCall = async (req, res) => {
  const { receiverId, duration, callType } = req.body;
  const callerId = req.user._id; // Authenticated male user

  try {
    // Validate input
    if (!receiverId || duration === undefined || duration === null) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.DURATION_REQUIRED
      });
    }

    // Validate duration
    if (duration < 0) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.DURATION_NEGATIVE
      });
    }

    // If duration is 0 or very short (less than 1 second), no charges
    if (duration === 0) {
      const callRecord = await CallHistory.create({
        callerId,
        receiverId,
        duration: 0,
        coinsPerSecond: 0,
        totalCoins: 0,
        callType: callType || 'video',
        status: 'completed'
      });

      return res.json({
        success: true,
        message: messages.CALL.CALL_NO_CHARGES,
        data: {
          duration: 0,
          coinsDeducted: 0,
          coinsCredited: 0,
          callId: callRecord._id
        }
      });
    }

    // Get caller (male user) and receiver (female user)
    const caller = await MaleUser.findById(callerId);
    const receiver = await FemaleUser.findById(receiverId);

    if (!caller) {
      return res.status(404).json({
        success: false,
        message: messages.CALL.CALLER_NOT_FOUND
      });
    }

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: messages.CALL.RECEIVER_NOT_FOUND
      });
    }

    // Get the per-second rate from female user
    const coinsPerSecond = receiver.coinsPerSecond || 2; // Default 2 if not set
    
    // Get minimum call coins setting from admin config
    const adminConfig = await AdminConfig.getConfig();
    const minCallCoins = adminConfig.minCallCoins || 60; // Default 60 if not set

    // Calculate maximum possible seconds based on current balance
    const maxSeconds = Math.floor(caller.coinBalance / coinsPerSecond);
    
    // Check if user has enough coins for the requested duration
    // If not, reject the call entirely rather than adjusting the duration
    const requestedCoins = duration * coinsPerSecond;
    if (caller.coinBalance < requestedCoins) {
      // Record failed call due to insufficient coins
      const callRecord = await CallHistory.create({
        callerId,
        receiverId,
        duration,
        coinsPerSecond,
        totalCoins: requestedCoins,
        callType: callType || 'video',
        status: 'insufficient_coins',
        errorMessage: `Insufficient coins. Required: ${requestedCoins}, Available: ${caller.coinBalance}`
      });

      return res.status(400).json({
        success: false,
        message: messages.CALL.INSUFFICIENT_COINS,
        data: {
          required: requestedCoins,
          available: caller.coinBalance,
          shortfall: requestedCoins - caller.coinBalance,
          callId: callRecord._id
        }
      });
    }
    
    // If we get here, user has enough coins for the full duration
    const billableSeconds = duration;
    
    // Calculate coins to charge based on billable seconds
    const coinsToCharge = billableSeconds * coinsPerSecond;
    
    // Deduct coins from male user
    caller.coinBalance -= coinsToCharge;
    await caller.save();

    // Credit earnings to female user's wallet balance (real money she can withdraw)
    receiver.walletBalance = (receiver.walletBalance || 0) + coinsToCharge;
    await receiver.save();

    // Create call history record
    const callRecord = await CallHistory.create({
      callerId,
      receiverId,
      duration,
      coinsPerSecond,
      totalCoins: coinsToCharge,
      callType: callType || 'video',
      status: 'completed'
    });

    // Create transaction records
    await Transaction.create({
      userType: 'male',
      userId: callerId,
      operationType: 'coin',
      action: 'debit',
      amount: coinsToCharge,
      message: `Video/Audio call with ${receiver.name || receiver.email} for ${billableSeconds} seconds`,
      balanceAfter: caller.coinBalance,
      createdBy: callerId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    await Transaction.create({
      userType: 'female',
      userId: receiverId,
      operationType: 'wallet',
      action: 'credit',
      amount: coinsToCharge,
      earningType: 'call',
      message: `Earnings from call with ${caller.name || caller.email} for ${billableSeconds} seconds`,
      balanceAfter: receiver.walletBalance,
      createdBy: receiverId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    // Return success response
    return res.json({
      success: true,
      message: messages.CALL.CALL_ENDED_SUCCESS,
      data: {
        callId: callRecord._id,
        duration: billableSeconds,
        coinsPerSecond,
        totalCoins: coinsToCharge,
        coinsDeducted: coinsToCharge,
        coinsCredited: coinsToCharge,
        callerRemainingBalance: caller.coinBalance,
        receiverNewBalance: receiver.walletBalance
      }
    });

  } catch (err) {
    console.error('Error ending call:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get call history for male user
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    const calls = await CallHistory.find({ callerId: userId })
      .populate('receiverId', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallHistory.countDocuments({ callerId: userId });

    return res.json({
      success: true,
      data: calls,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get call statistics for male user
exports.getCallStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await CallHistory.aggregate([
      { $match: { callerId: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCoinsSpent: { $sum: '$totalCoins' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      totalDuration: 0,
      totalCoinsSpent: 0
    };

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
```

### Female User Call Earnings Controller

The call earnings controller handles call earnings-related functionality for female users.

```javascript
// File: src/controllers/femaleUserControllers/callEarningsController.js
const CallHistory = require('../../models/common/CallHistory');

// Get call earnings history for female user
exports.getCallEarnings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    const calls = await CallHistory.find({ 
      receiverId: userId,
      status: 'completed' 
    })
      .populate('callerId', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallHistory.countDocuments({ 
      receiverId: userId,
      status: 'completed' 
    });

    return res.json({
      success: true,
      data: calls,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get call earnings statistics for female user
exports.getCallEarningsStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await CallHistory.aggregate([
      { $match: { receiverId: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalEarnings: { $sum: '$totalCoins' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      totalDuration: 0,
      totalEarnings: 0
    };

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
```

## Routes

### Male User Call Routes

The call routes for male users are defined in the male user routes file.

```javascript
// File: src/routes/maleUserRoutes/maleUserRoutes.js
const express = require('express');
const router = express.Router();
const maleUserController = require('../../controllers/maleUserControllers/maleUserController');
const followingFollowersController = require('../../controllers/maleUserControllers/followingFollowersController');
const blockListController = require('../../controllers/maleUserControllers/blockListController');
const callController = require('../../controllers/maleUserControllers/callController');
const auth = require('../../middlewares/authMiddleware');
const { parser } = require('../../config/multer');
const Transaction = require('../../models/common/Transaction');
const { getInterests } = require('../../controllers/common/interestController');
const { getLanguages } = require('../../controllers/common/languageController');
const { preventBlockedInteraction } = require('../../middlewares/blockMiddleware');

// Apply block middleware to all routes except block/unblock
router.use(preventBlockedInteraction);

// Public routes for interests and languages
router.get('/interests', getInterests);
router.get('/languages', getLanguages);

// Register Male User
router.post('/register', maleUserController.registerUser);

// Login Male User (Send OTP)
router.post('/login', maleUserController.loginUser);

// Get my transactions (male) with optional filters
router.get('/me/transactions', auth, async (req, res) => {
  try {
    const { operationType, startDate, endDate } = req.query;
    const filter = { userType: 'male', userId: req.user._id };
    if (operationType && ['wallet', 'coin'].includes(operationType)) filter.operationType = operationType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }
    const txns = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Login OTP
router.post('/verify-login-otp', maleUserController.verifyLoginOtp);

// Verify OTP and activate user
router.post('/verify-otp', maleUserController.verifyOtp);

// Get user profile
router.get('/me', auth, maleUserController.getUserProfile);

// Update user interests
router.put('/interests', auth, maleUserController.updateInterests);

// Update user languages
router.put('/languages', auth, maleUserController.updateLanguages);

// Update user hobbies
router.put('/hobbies', auth, maleUserController.updateHobbies);

// Update user sports
router.put('/sports', auth, maleUserController.updateSports);

// Update user film preferences
router.put('/film', auth, maleUserController.updateFilm);

// Update user music preferences
router.put('/music', auth, maleUserController.updateMusic);

// Update user travel preferences
router.put('/travel', auth, maleUserController.updateTravel);

// Browse female users (paginated)
router.get('/browse-females', auth, maleUserController.listFemaleUsers);

// Upload Images via form-data (field: images)
router.post('/upload-image', auth, parser.array('images', 5), maleUserController.uploadImage);

// Delete image by id
router.delete('/images/:imageId', auth, maleUserController.deleteImage);

// Send Follow Request to Female User
router.post('/follow-request/send', auth, followingFollowersController.sendFollowRequest);

// Cancel Sent Follow Request
router.post('/follow-request/cancel', auth, followingFollowersController.cancelFollowRequest);

// Get Sent Follow Requests
router.get('/follow-requests/sent', auth, followingFollowersController.getSentFollowRequests);

// Follow Female User (used internally when a follow request is accepted)
router.post('/follow', auth, followingFollowersController.followUser);

// Unfollow Female User
router.post('/unfollow', auth, followingFollowersController.unfollowUser);

// Get Following List
router.get('/following', auth, followingFollowersController.getMaleFollowingList);

// Get Followers List
router.get('/followers', auth, followingFollowersController.getMaleFollowersList);

// Buy Coins Package
router.post('/buy-coins', auth, maleUserController.buyCoins);

// Blocklist Routes
router.post('/block', auth, blockListController.blockUser);
router.post('/unblock', auth, blockListController.unblockUser);
router.get('/block-list', auth, blockListController.getBlockList);

// Call Routes
router.post('/calls/start', auth, callController.startCall);
router.post('/calls/end', auth, callController.endCall);
router.get('/calls/history', auth, callController.getCallHistory);
router.get('/calls/stats', auth, callController.getCallStats);

// Payment Routes are now handled directly in app.js

module.exports = router;
```

### Female User Call Routes

The call earnings routes for female users are defined in the female user routes file.

```javascript
// File: src/routes/femaleUserRoutes/femaleUserRoutes.js
// Relevant call-related routes only (from the actual file)
const callEarningsController = require('../../controllers/femaleUserControllers/callEarningsController');
const statsController = require('../../controllers/femaleUserControllers/statsController');
const auth = require('../../middlewares/authMiddleware');
const requireReviewAccepted = require('../../middlewares/reviewStatusMiddleware');

// Call earnings routes for female users
router.get('/calls/earnings', auth, requireReviewAccepted, callEarningsController.getCallEarnings);
router.get('/calls/earnings-stats', auth, requireReviewAccepted, callEarningsController.getCallEarningsStats);

// Missed calls routes
router.post('/increment-missed-calls', auth, requireReviewAccepted, statsController.incrementMissedCalls);
router.post('/increment-missed-calls/:userId', auth, requireReviewAccepted, statsController.incrementMissedCalls);
```

## Call Flow

The call system follows this flow:

1. **Pre-call checks** (startCall):
   - Validate receiver ID
   - Verify both users exist
   - Check if users follow each other
   - Check if users have blocked each other
   - Verify caller has minimum required coins
   - Calculate maximum possible call duration based on balance

2. **During call**:
   - Frontend manages timer based on available coins
   - User can end call at any time

3. **Post-call processing** (endCall):
   - Validate duration
   - Check if user has enough coins for the full duration
   - If sufficient coins: deduct from caller, credit to receiver
   - If insufficient coins: record failed call with error
   - Create call history record
   - Create transaction records for both users

4. **Earnings**:
   - Coins spent by male user are credited to female user's wallet balance
   - Female users can withdraw these earnings

## Error Messages

The call system includes comprehensive error messages defined in the messages file:

```javascript
// File: src/validations/messages.js
CALL: {
  RECEIVER_REQUIRED: "receiverId is required",
  CALLER_NOT_FOUND: "Caller not found",
  RECEIVER_NOT_FOUND: "Receiver not found",
  FOLLOW_EACH_OTHER: "Both users must follow each other to start a call",
  BLOCKED_CANNOT_CALL: "Either user has blocked the other, cannot start call",
  MIN_COINS_REQUIRED: (minCallCoins) => `Minimum ${minCallCoins} coins required to start a call`,
  NOT_ENOUGH_COINS: "Not enough coins to start call",
  CALL_CAN_START: "Call can be started",
  DURATION_REQUIRED: "receiverId and duration are required",
  DURATION_NEGATIVE: "Duration cannot be negative",
  CALL_NO_CHARGES: "Call ended (no charges for 0 duration)",
  INSUFFICIENT_COINS: "Insufficient coins",
  CALL_ENDED_SUCCESS: "Call ended successfully"
}
```

## Configuration

The call system can be configured by administrators through the AdminConfig model:

- **minCallCoins**: Minimum coins required to start a call (default: 60)
- **coinsPerSecond**: Rate at which female users charge per second (default: 2, configurable per user)
- **coinToRupeeConversionRate**: Rate for converting coins to rupees (default: 10 coins = 1 Rupee)

The system provides admin endpoints to update these settings as needed.