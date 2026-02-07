# Complete Call System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Models](#models)
3. [Controllers](#controllers)
4. [Routes](#routes)
5. [API Endpoints](#api-endpoints)
6. [Call Flow](#call-flow)

## Overview
The call system enables video/audio communication between male and female users. The system includes call initiation, status management, duration tracking, earnings calculation, and transaction recording. The system uses rate freezing to prevent rate changes during active calls.

## Models

### CallHistory Model
**File:** `src/models/common/CallHistory.js`

```javascript
const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
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
  callType: { 
    type: String, 
    enum: ['audio', 'video'], 
    required: true 
  },
  duration: { 
    type: Number, 
    default: 0 // Actual duration in seconds
  },
  billableDuration: { 
    type: Number, 
    default: 0 // Billable duration in seconds (minimum 30 seconds)
  },
  femaleEarningPerMinute: { 
    type: Number, 
    required: true // Female earning rate per minute
  },
  platformMarginPerMinute: { 
    type: Number, 
    required: true // Platform margin per minute
  },
  femaleEarningPerSecond: { 
    type: Number, 
    required: true // Female earning rate per second
  },
  platformMarginPerSecond: { 
    type: Number, 
    required: true // Platform margin per second
  },
  totalCoins: { 
    type: Number, 
    required: true // Total coins spent by male user
  },
  femaleEarning: { 
    type: Number, 
    required: true // Amount earned by female user
  },
  platformMargin: { 
    type: Number, 
    required: true // Platform commission
  },
  adminEarned: { 
    type: Number, 
    default: 0 // Amount earned by admin
  },
  agencyEarned: { 
    type: Number, 
    default: 0 // Amount earned by agency (if applicable)
  },
  adminSharePercentage: { 
    type: Number, 
    default: 0 // Percentage of platform margin to admin
  },
  agencySharePercentage: { 
    type: Number, 
    default: 0 // Percentage of platform margin to agency
  },
  isAgencyFemale: { 
    type: Boolean, 
    default: false // Whether female belongs to agency
  },
  status: { 
    type: String, 
    enum: ['initiated', 'ongoing', 'completed', 'insufficient_coins'], 
    default: 'initiated' 
  },
  rating: { 
    type: {
      stars: Number,
      message: String,
      ratedBy: String, // 'male' or 'female'
      ratedAt: Date
    }
  },
  errorMessage: { 
    type: String // Error message if call failed
  }
}, { timestamps: true });

module.exports = mongoose.model('CallHistory', callHistorySchema);
```

### CallSession Model
**File:** `src/models/common/CallSession.js`

```javascript
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
```

## Controllers

### Male User Call Controller
**File:** `src/controllers/maleUserControllers/callController.js`

```javascript
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const CallHistory = require('../../models/common/CallHistory');
const Transaction = require('../../models/common/Transaction');
const AdminConfig = require('../../models/admin/AdminConfig');
const AdminLevelConfig = require('../../models/admin/AdminLevelConfig');
const messages = require('../../validations/messages');
const { applyCallTargetReward } = require('../../services/realtimeRewardService');

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

    // Check if female user is online
    if (!receiver.onlineStatus) {
      return res.status(400).json({
        success: false,
        message: 'The selected user is currently offline'
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

    // Get the level configuration for the receiver's current level
    const levelConfig = await AdminLevelConfig.findOne({ 
      level: receiver.currentLevel, 
      isActive: true 
    });
    
    if (!levelConfig) {
      return res.status(400).json({
        success: false,
        message: 'Level configuration not found for receiver'
      });
    }
    
    // Get female earning rate per minute from level config based on call type and convert to per second
    const femaleRatePerMinute = 
      callType === 'audio' 
        ? levelConfig.audioRatePerMinute 
        : levelConfig.videoRatePerMinute;
    
    if (!femaleRatePerMinute) {
      return res.status(400).json({
        success: false,
        message: 'Level configuration does not have rate set for this call type'
      });
    }
    
    const femaleRatePerSecond = femaleRatePerMinute / 60;
    
    // Determine if female belongs to agency
    const isAgencyFemale = !!receiver.referredByAgency;
    
    // Get platform margin per minute and convert to per second
    const platformMarginPerMinute = 
      isAgencyFemale 
        ? levelConfig.platformMarginPerMinute.agency
        : levelConfig.platformMarginPerMinute.nonAgency;
    
    const platformRatePerSecond = platformMarginPerMinute / 60;
    
    // Calculate male pay rate per second
    const malePayPerSecond = femaleRatePerSecond + platformRatePerSecond;
    
    // Get admin config
    const adminConfig = await AdminConfig.getConfig();
    
    // Check minCallCoins as an entry requirement (anti-spam quality gate)
    if (adminConfig.minCallCoins !== undefined && adminConfig.minCallCoins !== null && adminConfig.minCallCoins > 0) {
      if (caller.coinBalance < adminConfig.minCallCoins) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance to start call. Please recharge.',
          data: {
            available: caller.coinBalance,
            required: adminConfig.minCallCoins
          }
        });
      }
    }
    
    // Apply minimum billable duration rule for start validation
    const MIN_BILLABLE_SECONDS = 30;
    const minCoinsToStart = Math.ceil(MIN_BILLABLE_SECONDS * malePayPerSecond);
    
    // Check if user has enough coins for minimum billable duration
    if (caller.coinBalance < minCoinsToStart) {
      return res.status(400).json({
        success: false,
        message: messages.CALL.NOT_ENOUGH_COINS,
        data: {
          available: caller.coinBalance,
          required: minCoinsToStart,
          femaleRatePerSecond,
          platformRatePerSecond,
          malePayPerSecond,
          minBillableSeconds: MIN_BILLABLE_SECONDS
        }
      });
    }
    
    // Check for existing active session to prevent multiple calls
    const CallSession = require('../../models/common/CallSession');
        
    const existingSession = await CallSession.findOne({
      callerId,
      isActive: true
    });
        
    if (existingSession) {
      // Return the existing active call information to help frontend recover
      return res.status(409).json({
        success: false,
        message: 'You already have an active call session',
        data: {
          callId: existingSession.callId,
          receiverId: existingSession.receiverId,
          callType: existingSession.callType,
          startedAt: existingSession.createdAt
        }
      });
    }
        
    // Calculate maximum possible seconds based on male's balance and the total rate
    const maxSeconds = Math.floor(caller.coinBalance / malePayPerSecond);
        
    // Create a call session to freeze rates and prevent rate changes during call
        
    // Generate a unique call session ID
    const callId = `call_${callerId}_${receiverId}_${Date.now()}`;
        
    // Set session to expire after 2 hours (in case call doesn't end properly)
    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 2);
        
    await CallSession.create({
      callId,
      callerId,
      receiverId,
      femaleRatePerSecond,
      platformRatePerSecond,
      malePayPerSecond,
      callType,
      receiverLevel: receiver.currentLevel,
      isAgencyFemale,
      femaleRatePerMinute: femaleRatePerMinute,
      platformMarginPerMinute: platformMarginPerMinute,
      expiresAt: sessionExpiry
    });
    
    // Return success response with maxSeconds for frontend timer
    return res.json({
      success: true,
      message: messages.CALL.CALL_CAN_START,
      data: {
        callId, // Include the call session ID
        maxSeconds,
        femaleRatePerSecond,
        platformRatePerSecond,
        malePayPerSecond,
        callerCoinBalance: caller.coinBalance,
        isAgencyFemale,
        receiverLevel: receiver.currentLevel,
        levelConfig: {
          audioRatePerMinute: levelConfig.audioRatePerMinute,
          videoRatePerMinute: levelConfig.videoRatePerMinute,
          platformMarginPerMinute: platformMarginPerMinute
        }
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
  const { receiverId, duration, callType, callId } = req.body;
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

    // Get caller (male user) and receiver (female user)
    let caller = await MaleUser.findById(callerId);
    const receiver = await FemaleUser.findById(receiverId);

    if (!caller || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the call session to use frozen rates (prevents rate changes during call)
    const CallSession = require('../../models/common/CallSession');
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        message: 'Call session ID is required'
      });
    }
    
    const callSession = await CallSession.findOne({ 
      callId, 
      callerId, 
      receiverId, 
      isActive: true 
    });
    
    if (!callSession) {
      return res.status(400).json({
        success: false,
        message: 'Call session not found or invalid. Call may have expired or already ended.'
      });
    }

    // Use frozen rates from the call session
    const {
      femaleRatePerSecond,
      platformRatePerSecond,
      malePayPerSecond,
      isAgencyFemale,
      femaleRatePerMinute,
      platformMarginPerMinute
    } = callSession;
    
    // Determine if female belongs to agency (from session)
    
    // If duration is 0, return error as this should not happen with proper validation
    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Call did not connect. No charges applied.'
      });
    }

    // Get admin config
    const adminConfig = await AdminConfig.getConfig();
    
    // Use frozen per-minute rate from the session (not live data)
    const femaleEarningPerMinute = femaleRatePerMinute;
    
    if (!femaleEarningPerMinute) {
      return res.status(400).json({
        success: false,
        message: 'Female call rate not set for this call type'
      });
    }
    
    // No need to check minCallCoins here as validation happens at startCall
    // Apply minimum billable duration rule
    const MIN_BILLABLE_SECONDS = 30;
    const billableSeconds = duration < MIN_BILLABLE_SECONDS ? MIN_BILLABLE_SECONDS : duration;
    
    // Check if user has enough coins for the billable duration
    // If not, reject the call entirely rather than adjusting the duration
    const requestedMalePay = Math.ceil(billableSeconds * malePayPerSecond);
    
    if (caller.coinBalance < requestedMalePay) {
      // Mark the call session as inactive before returning error
      await CallSession.updateOne({ callId }, { isActive: false });
      
      // For failed calls, no earnings should be recorded
      const adminEarned = 0;
      const agencyEarned = 0;
      const femaleEarning = 0;
      const platformMargin = 0;
      
      // Record failed call attempt (no earnings generated)
      const callRecord = await CallHistory.create({
        callerId,
        receiverId,
        duration,
        femaleEarningPerMinute: femaleEarningPerMinute,
        platformMarginPerMinute: platformMarginPerMinute, // Use frozen value from session
        femaleEarningPerSecond: femaleRatePerSecond,
        platformMarginPerSecond: platformRatePerSecond,
        totalCoins: 0, // No coins actually spent
        femaleEarning,
        platformMargin,
        adminEarned,
        agencyEarned,
        isAgencyFemale,
        callType: callType || 'video',
        status: 'insufficient_coins',
        errorMessage: `Insufficient coins. Required: ${requestedMalePay}, Available: ${caller.coinBalance}`
      });

      return res.status(400).json({
        success: false,
        message: messages.CALL.INSUFFICIENT_COINS,
        data: {
          required: requestedMalePay,
          available: caller.coinBalance,
          shortfall: requestedMalePay - caller.coinBalance,
          callId: callRecord._id
        }
      });
    }
    
    // Calculate amounts with single rounding point to prevent coin leakage
    const malePay = Math.ceil(billableSeconds * malePayPerSecond);
    const femaleEarning = Math.floor(malePay * (femaleRatePerSecond / malePayPerSecond));
    const platformMargin = malePay - femaleEarning;
    
    // Deduct coins from male user atomically to prevent race conditions
    const updatedCaller = await MaleUser.findOneAndUpdate(
      { _id: callerId, coinBalance: { $gte: malePay } },
      { $inc: { coinBalance: -malePay } },
      { new: true }
    );
    
    if (!updatedCaller) {
      // Mark the call session as inactive before returning error
      await CallSession.updateOne({ callId }, { isActive: false });
      
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or balance changed. Please retry.'
      });
    }
    
    // Update caller reference to the updated document
    caller = updatedCaller;

    // Credit earnings to female user's wallet balance (real money she can withdraw)
    receiver.walletBalance = (receiver.walletBalance || 0) + femaleEarning;
    await receiver.save();

    // Calculate admin and agency shares from platform margin
    let adminEarned = 0;
    let agencyEarned = 0;
    let adminSharePercentage = 0;
    let agencySharePercentage = 0;
    
    if (isAgencyFemale) {
      // For agency females, split the platform margin
      if (adminConfig.adminSharePercentage === undefined || adminConfig.adminSharePercentage === null) {
        // Mark the call session as inactive before returning error
        await CallSession.updateOne({ callId }, { isActive: false });
        
        return res.status(400).json({
          success: false,
          message: 'Admin share percentage not configured'
        });
      }
      adminSharePercentage = adminConfig.adminSharePercentage;
      agencySharePercentage = 100 - adminSharePercentage;
      
      adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
      agencyEarned = Number((platformMargin * agencySharePercentage / 100).toFixed(2));
    } else {
      // For non-agency females, all platform margin goes to admin
      adminSharePercentage = 100;
      agencySharePercentage = 0;
      adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
      agencyEarned = 0;
    }
    
    // Mark the call session as inactive
    await CallSession.updateOne(
      { callId },
      { isActive: false }
    );
    
    // Create call history record
    const callRecord = await CallHistory.create({
      callerId,
      receiverId,
      duration: duration, // Store actual duration
      billableDuration: billableSeconds, // Store billable duration
      femaleEarningPerMinute: femaleEarningPerMinute,
      platformMarginPerMinute: platformMarginPerMinute, // Use frozen value from session
      femaleEarningPerSecond: femaleRatePerSecond,
      platformMarginPerSecond: platformRatePerSecond,
      totalCoins: malePay,
      femaleEarning,
      platformMargin,
      adminEarned,
      agencyEarned,
      adminSharePercentage,
      agencySharePercentage,
      isAgencyFemale,
      callType: callType || 'video',
      status: 'completed'
    });
    
    // ✅ APPLY REAL-TIME CALL TARGET REWARD
    // This triggers immediately when call completes
    await applyCallTargetReward(receiverId, callType || 'video', callRecord._id);

    // Create transaction records
    await Transaction.create({
      userType: 'male',
      userId: callerId,
      operationType: 'coin',
      action: 'debit',
      amount: malePay,
      message: `Video/Audio call with ${receiver.name || receiver.email} for ${billableSeconds} seconds (Female earning: ${femaleEarning}, Platform margin: ${platformMargin})`,
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
      amount: femaleEarning,
      earningType: 'call',
      message: `Earnings from call with ${caller.name || caller.email} for ${billableSeconds} seconds`,
      balanceAfter: receiver.walletBalance,
      createdBy: receiverId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    // Create transaction for admin revenue tracking (not a wallet credit)
    // We'll skip creating a transaction for admin revenue to avoid validation issues
    // Admin revenue is tracked in the call history record instead
    // Future enhancement: create separate admin revenue tracking model
    
    // Create transaction for agency commission and update agency wallet (if applicable)
    if (agencyEarned > 0 && receiver.referredByAgency) {
      const agencyUserId = receiver.referredByAgency; // Get agency
      
      // Update agency wallet balance
      const AgencyUser = require('../../models/agency/AgencyUser');
      const agency = await AgencyUser.findById(agencyUserId);
      if (agency) {
        agency.walletBalance = (agency.walletBalance || 0) + agencyEarned;
        await agency.save();
      }
      
      await Transaction.create({
        userType: 'agency',
        userId: agencyUserId,
        operationType: 'wallet',
        action: 'credit',
        amount: agencyEarned,
        earningType: 'call',
        message: `Agency commission from call between ${caller.name || caller.email} and ${receiver.name || receiver.email} for ${billableSeconds} seconds`,
        balanceAfter: agency ? agency.walletBalance : 0, // Agency wallet balance after update
        createdBy: callerId,
        relatedId: callRecord._id,
        relatedModel: 'CallHistory'
      });
    }

    // Return success response
    return res.json({
      success: true,
      message: messages.CALL.CALL_ENDED_SUCCESS,
      data: {
        callId: callRecord._id,
        duration: duration, // Actual duration
        billableDuration: billableSeconds, // Billable duration
        femaleEarningPerSecond: femaleRatePerSecond,
        platformMarginPerSecond: platformRatePerSecond,
        totalCoins: malePay,
        coinsDeducted: malePay,
        femaleEarning,
        platformMargin,
        callerRemainingBalance: caller.coinBalance,
        receiverNewBalance: receiver.walletBalance,
        ratingRequired: true // Female user needs to rate the call
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

// Get call history for user (works for both male and female users)
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    // Find calls where the user is either caller or receiver
    const calls = await CallHistory.find({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Transform the calls to include user details
    const transformedCalls = await Promise.all(calls.map(async (call) => {
      // Determine the other user based on the current user's role
      let otherUser;
      let otherUserId;
      let otherUserType;
      let profileImageUrl = null;
      
      if (call.callerId.toString() === userId.toString()) {
        // Current user (male) is caller, other user is receiver (female)
        otherUser = await FemaleUser.findById(call.receiverId).select('name images');
        otherUserId = call.receiverId;
        otherUserType = 'female';
        
        // Get the first image as profile picture
        if (otherUser && otherUser.images && otherUser.images.length > 0) {
          const firstImageId = otherUser.images[0];
          const FemaleImage = require('../../models/femaleUser/Image');
          const imageDoc = await FemaleImage.findById(firstImageId);
          if (imageDoc) {
            profileImageUrl = imageDoc.imageUrl;
          }
        }
      } else {
        // Current user (male) is receiver, other user is caller (male)
        otherUser = await MaleUser.findById(call.callerId).select('firstName lastName images');
        otherUserId = call.callerId;
        otherUserType = 'male';
        
        // Get the first image as profile picture
        if (otherUser && otherUser.images && otherUser.images.length > 0) {
          const firstImageId = otherUser.images[0];
          const MaleImage = require('../../models/maleUser/Image');
          const imageDoc = await MaleImage.findById(firstImageId);
          if (imageDoc) {
            profileImageUrl = imageDoc.imageUrl;
          }
        }
      }
      
      // Build the name properly for both male and female users
      let userName = 'Unknown User';
      if (otherUser) {
        if (otherUserType === 'male') {
          // Male users have firstName and lastName
          userName = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim();
          if (!userName) userName = 'Unknown User';
        } else {
          // Female users have name field
          userName = otherUser.name || 'Unknown User';
        }
      }
      
      return {
        userId: otherUserId,
        name: userName,
        profileImage: profileImageUrl,
        callType: call.callType,
        status: call.status,
        billableDuration: call.status === 'completed' ? call.billableDuration : 0,
        femaleEarningPerMinute: call.femaleEarningPerMinute,
        rating: (call.rating && call.rating.stars) ? call.rating.message : null, // Include rating message directly
        createdAt: call.createdAt,
        callId: call._id
      };
    }));

    const total = await CallHistory.countDocuments({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    });

    return res.json({
      success: true,
      data: transformedCalls,
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

// Get active call for user
exports.getActiveCall = async (req, res) => {
  try {
    const callerId = req.user._id;

    const CallSession = require('../../models/common/CallSession');

    const activeCall = await CallSession.findOne({
      callerId,
      isActive: true
    });

    if (!activeCall) {
      return res.json({
        success: true,
        data: null
      });
    }

    return res.json({
      success: true,
      data: {
        callId: activeCall.callId,
        receiverId: activeCall.receiverId,
        callType: activeCall.callType,
        startedAt: activeCall.createdAt
      }
    });
  } catch (err) {
    console.error('Error getting active call:', err);
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

### Female User Call Controller
**File:** `src/controllers/femaleUserControllers/callController.js`

```javascript
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const CallHistory = require('../../models/common/CallHistory');

// Get call history for female user (same logic as male user)
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    // Find calls where the user is either caller or receiver
    const calls = await CallHistory.find({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Transform the calls to include user details
    const transformedCalls = await Promise.all(calls.map(async (call) => {
      // Determine the other user based on the current user's role
      let otherUser;
      let otherUserId;
      let otherUserType;
      let profileImageUrl = null;
      
      if (call.callerId.toString() === userId.toString()) {
        // Current user (female) is caller, other user is receiver (male)
        otherUser = await MaleUser.findById(call.receiverId).select('firstName lastName images');
        otherUserId = call.receiverId;
        otherUserType = 'male';
        
        // Get the first image as profile picture
        if (otherUser && otherUser.images && otherUser.images.length > 0) {
          const firstImageId = otherUser.images[0];
          const MaleImage = require('../../models/maleUser/Image');
          const imageDoc = await MaleImage.findById(firstImageId);
          if (imageDoc) {
            profileImageUrl = imageDoc.imageUrl;
          }
        }
      } else {
        // Current user (female) is receiver, other user is caller (male)
        otherUser = await MaleUser.findById(call.callerId).select('firstName lastName images');
        otherUserId = call.callerId;
        otherUserType = 'male';
        
        // Get the first image as profile picture
        if (otherUser && otherUser.images && otherUser.images.length > 0) {
          const firstImageId = otherUser.images[0];
          const MaleImage = require('../../models/maleUser/Image');
          const imageDoc = await MaleImage.findById(firstImageId);
          if (imageDoc) {
            profileImageUrl = imageDoc.imageUrl;
          }
        }
      }
      
      // Build the name properly for male users
      let userName = 'Unknown User';
      if (otherUser) {
        if (otherUserType === 'male') {
          // Male users have firstName and lastName
          userName = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim();
          if (!userName) userName = 'Unknown User';
        } else {
          // Female users have name field
          userName = otherUser.name || 'Unknown User';
        }
      }
      
      return {
        userId: otherUserId,
        name: userName,
        profileImage: profileImageUrl,
        callType: call.callType,
        status: call.status,
        billableDuration: call.status === 'completed' ? call.billableDuration : 0,
        femaleEarningPerMinute: call.femaleEarningPerMinute,
        rating: (call.rating && call.rating.stars) ? call.rating.message : null, // Include rating message directly
        createdAt: call.createdAt,
        callId: call._id
      };
    }));

    const total = await CallHistory.countDocuments({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    });

    return res.json({
      success: true,
      data: transformedCalls,
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

// Get call statistics for female user
exports.getCallStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await CallHistory.aggregate([
      { 
        $match: { 
          $or: [
            { callerId: userId },
            { receiverId: userId }
          ],
          status: 'completed' 
        } 
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCoinsSpent: { $sum: '$totalCoins' },
          totalEarnings: { $sum: '$femaleEarning' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      totalDuration: 0,
      totalCoinsSpent: 0,
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

// End Call - Female user can end the call
// Note: This is primarily for female users to end calls they're receiving
exports.endCall = async (req, res) => {
  const { callerId, duration, callType, callId } = req.body;
  const receiverId = req.user._id; // Authenticated female user

  try {
    // Validate input
    if (!callerId || duration === undefined || duration === null) {
      return res.status(400).json({
        success: false,
        message: 'Caller ID and duration are required'
      });
    }

    // Validate duration
    if (duration < 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration cannot be negative'
      });
    }

    // Get caller (male user) and receiver (female user)
    const caller = await MaleUser.findById(callerId);
    let receiver = await FemaleUser.findById(receiverId);

    if (!caller || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the call session to use frozen rates (prevents rate changes during call)
    const CallSession = require('../../models/common/CallSession');
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        message: 'Call session ID is required'
      });
    }
    
    const callSession = await CallSession.findOne({ 
      callId, 
      callerId, 
      receiverId, 
      isActive: true 
    });
    
    if (!callSession) {
      return res.status(400).json({
        success: false,
        message: 'Call session not found or invalid. Call may have expired or already ended.'
      });
    }

    // Use frozen rates from the call session
    const {
      femaleRatePerSecond,
      platformRatePerSecond,
      malePayPerSecond,
      isAgencyFemale,
      femaleRatePerMinute,
      platformMarginPerMinute
    } = callSession;
    
    // If duration is 0, return error as this should not happen with proper validation
    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Call did not connect. No charges applied.'
      });
    }

    // Get admin config
    const AdminConfig = require('../../models/admin/AdminConfig');
    const adminConfig = await AdminConfig.getConfig();
    
    // Use frozen per-minute rate from the session (not live data)
    const femaleEarningPerMinute = femaleRatePerMinute;
    
    if (!femaleEarningPerMinute) {
      return res.status(400).json({
        success: false,
        message: 'Female call rate not set for this call type'
      });
    }
    
    // No need to check minCallCoins here as validation happens at startCall
    // Apply minimum billable duration rule
    const MIN_BILLABLE_SECONDS = 30;
    const billableSeconds = duration < MIN_BILLABLE_SECONDS ? MIN_BILLABLE_SECONDS : duration;
    
    // Check if user has enough coins for the billable duration
    // If not, reject the call entirely rather than adjusting the duration
    const requestedMalePay = Math.ceil(billableSeconds * malePayPerSecond);
    
    if (caller.coinBalance < requestedMalePay) {
      // Mark the call session as inactive before returning error
      await CallSession.updateOne({ callId }, { isActive: false });
      
      // For failed calls, no earnings should be recorded
      const adminEarned = 0;
      const agencyEarned = 0;
      const femaleEarning = 0;
      const platformMargin = 0;
      
      // Record failed call attempt (no earnings generated)
      const callRecord = await CallHistory.create({
        callerId,
        receiverId,
        duration,
        femaleEarningPerMinute: femaleEarningPerMinute,
        platformMarginPerMinute: platformMarginPerMinute, // Use frozen value from session
        femaleEarningPerSecond: femaleRatePerSecond,
        platformMarginPerSecond: platformRatePerSecond,
        totalCoins: 0, // No coins actually spent
        femaleEarning,
        platformMargin,
        adminEarned,
        agencyEarned,
        isAgencyFemale,
        callType: callType || 'video',
        status: 'insufficient_coins',
        errorMessage: `Insufficient coins. Required: ${requestedMalePay}, Available: ${caller.coinBalance}`
      });

      return res.status(400).json({
        success: false,
        message: 'Insufficient coins for male user to complete call',
        data: {
          required: requestedMalePay,
          available: caller.coinBalance,
          shortfall: requestedMalePay - caller.coinBalance,
          callId: callRecord._id
        }
      });
    }
    
    // Calculate amounts with single rounding point to prevent coin leakage
    const malePay = Math.ceil(billableSeconds * malePayPerSecond);
    const femaleEarning = Math.floor(malePay * (femaleRatePerSecond / malePayPerSecond));
    const platformMargin = malePay - femaleEarning;
    
    // Deduct coins from male user atomically to prevent race conditions
    const updatedCaller = await MaleUser.findOneAndUpdate(
      { _id: callerId, coinBalance: { $gte: malePay } },
      { $inc: { coinBalance: -malePay } },
      { new: true }
    );
    
    if (!updatedCaller) {
      // Mark the call session as inactive before returning error
      await CallSession.updateOne({ callId }, { isActive: false });
      
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or balance changed. Please retry.'
      });
    }
    
    // Update receiver reference to the updated document
    receiver = await FemaleUser.findById(receiverId);

    // Credit earnings to female user's wallet balance (real money she can withdraw)
    receiver.walletBalance = (receiver.walletBalance || 0) + femaleEarning;
    await receiver.save();

    // Calculate admin and agency shares from platform margin
    let adminEarned = 0;
    let agencyEarned = 0;
    let adminSharePercentage = 0;
    let agencySharePercentage = 0;
    
    if (isAgencyFemale) {
      // For agency females, split the platform margin
      if (adminConfig.adminSharePercentage === undefined || adminConfig.adminSharePercentage === null) {
        // Mark the call session as inactive before returning error
        await CallSession.updateOne({ callId }, { isActive: false });
        
        return res.status(400).json({
          success: false,
          message: 'Admin share percentage not configured'
        });
      }
      adminSharePercentage = adminConfig.adminSharePercentage;
      agencySharePercentage = 100 - adminSharePercentage;
      
      adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
      agencyEarned = Number((platformMargin * agencySharePercentage / 100).toFixed(2));
    } else {
      // For non-agency females, all platform margin goes to admin
      adminSharePercentage = 100;
      agencySharePercentage = 0;
      adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
      agencyEarned = 0;
    }
    
    // Mark the call session as inactive
    await CallSession.updateOne(
      { callId },
      { isActive: false }
    );
    
    // Create call history record
    const callRecord = await CallHistory.create({
      callerId,
      receiverId,
      duration: duration, // Store actual duration
      billableDuration: billableSeconds, // Store billable duration
      femaleEarningPerMinute: femaleEarningPerMinute,
      platformMarginPerMinute: platformMarginPerMinute, // Use frozen value from session
      femaleEarningPerSecond: femaleRatePerSecond,
      platformMarginPerSecond: platformRatePerSecond,
      totalCoins: malePay,
      femaleEarning,
      platformMargin,
      adminEarned,
      agencyEarned,
      adminSharePercentage,
      agencySharePercentage,
      isAgencyFemale,
      callType: callType || 'video',
      status: 'completed'
    });
    
    // ✅ APPLY REAL-TIME CALL TARGET REWARD
    // This triggers immediately when call completes
    const { applyCallTargetReward } = require('../../services/realtimeRewardService');
    await applyCallTargetReward(receiverId, callType || 'video', callRecord._id);

    // Create transaction records
    const Transaction = require('../../models/common/Transaction');
    
    await Transaction.create({
      userType: 'male',
      userId: callerId,
      operationType: 'coin',
      action: 'debit',
      amount: malePay,
      message: `Video/Audio call with ${receiver.name || receiver.email} for ${billableSeconds} seconds (Female earning: ${femaleEarning}, Platform margin: ${platformMargin})`,
      balanceAfter: updatedCaller.coinBalance,
      createdBy: callerId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    await Transaction.create({
      userType: 'female',
      userId: receiverId,
      operationType: 'wallet',
      action: 'credit',
      amount: femaleEarning,
      earningType: 'call',
      message: `Earnings from call with ${updatedCaller.firstName || updatedCaller.lastName || updatedCaller.email} for ${billableSeconds} seconds`,
      balanceAfter: receiver.walletBalance,
      createdBy: receiverId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    // Create transaction for admin revenue tracking (not a wallet credit)
    // We'll skip creating a transaction for admin revenue to avoid validation issues
    // Admin revenue is tracked in the call history record instead
    // Future enhancement: create separate admin revenue tracking model
    
    // Create transaction for agency commission and update agency wallet (if applicable)
    if (agencyEarned > 0 && receiver.referredByAgency) {
      const agencyUserId = receiver.referredByAgency; // Get agency
      
      // Update agency wallet balance
      const AgencyUser = require('../../models/agency/AgencyUser');
      const agency = await AgencyUser.findById(agencyUserId);
      if (agency) {
        agency.walletBalance = (agency.walletBalance || 0) + agencyEarned;
        await agency.save();
      }
      
      await Transaction.create({
        userType: 'agency',
        userId: agencyUserId,
        operationType: 'wallet',
        action: 'credit',
        amount: agencyEarned,
        earningType: 'call',
        message: `Agency commission from call between ${updatedCaller.firstName || updatedCaller.lastName || updatedCaller.email} and ${receiver.name || receiver.email} for ${billableSeconds} seconds`,
        balanceAfter: agency ? agency.walletBalance : 0, // Agency wallet balance after update
        createdBy: callerId,
        relatedId: callRecord._id,
        relatedModel: 'CallHistory'
      });
    }

    // Return success response
    return res.json({
      success: true,
      message: 'Call ended successfully',
      data: {
        callId: callRecord._id,
        duration: duration, // Actual duration
        billableDuration: billableSeconds, // Billable duration
        femaleEarningPerSecond: femaleRatePerSecond,
        platformMarginPerSecond: platformRatePerSecond,
        totalCoins: malePay,
        coinsDeducted: malePay,
        femaleEarning,
        platformMargin,
        callerRemainingBalance: updatedCaller.coinBalance,
        receiverNewBalance: receiver.walletBalance,
        ratingRequired: true // Female user needs to rate the call
      }
    });

  } catch (err) {
    console.error('Error ending call from female side:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Helper function to get rating message
function getRatingMessage(stars) {
  const map = {
    1: "Very Bad",
    2: "Bad",
    3: "Average",
    4: "Good",
    5: "Very Good"
  };
  return map[stars];
}

// Submit call rating
exports.submitCallRating = async (req, res) => {
  const { callId, stars } = req.body;
  const femaleUserId = req.user._id; // Authenticated female user

  try {
    // Validate input
    if (!callId) {
      return res.status(400).json({
        success: false,
        message: 'Call ID is required'
      });
    }

    if (typeof stars !== 'number' || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be a number between 1 and 5'
      });
    }

    // Find the call history record
    const CallHistory = require('../../models/common/CallHistory');
    const call = await CallHistory.findOne({ 
      _id: callId,
      receiverId: femaleUserId // Ensure female user can only rate calls they received
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or you are not authorized to rate this call'
      });
    }

    // Check if call has already been rated
    if (call.rating && call.rating.stars !== null) {
      return res.status(400).json({
        success: false,
        message: 'Call has already been rated'
      });
    }

    // Update the rating
    call.rating = {
      stars: stars,
      message: getRatingMessage(stars),
      ratedBy: 'female',
      ratedAt: new Date()
    };

    await call.save();

    return res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        stars: stars,
        message: getRatingMessage(stars)
      }
    });

  } catch (err) {
    console.error('Error submitting call rating:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
```

## Routes

### Male User Call Routes
**File:** `src/routes/maleUserRoutes/maleUserRoutes.js`

```javascript
// Call-related routes
router.post('/calls/start', auth, callController.startCall);
router.post('/calls/end', auth, callController.endCall);
router.get('/calls/active', auth, callController.getActiveCall);
router.get('/calls/history', auth, callController.getCallHistory);
router.get('/calls/stats', auth, callController.getCallStats);
```

### Female User Call Routes
**File:** `src/routes/femaleUserRoutes/femaleUserRoutes.js`

```javascript
const callController = require('../../controllers/femaleUserControllers/callController');
router.get('/calls/history', auth, requireReviewAccepted, callController.getCallHistory);
router.get('/calls/stats', auth, requireReviewAccepted, callController.getCallStats);
router.post('/calls/end', auth, requireReviewAccepted, callController.endCall);
router.post('/calls/rate', auth, requireReviewAccepted, callController.submitCallRating);
```

## API Endpoints

### Male User Call Endpoints

#### POST /male-user/calls/start
Starts a new call with a female user and creates a session.

**Request Body:**
```json
{
  "receiverId": "female_user_id",
  "callType": "audio|video"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call can start",
  "data": {
    "callId": "call_session_id",
    "maxSeconds": 1200,
    "femaleRatePerSecond": 0.5,
    "platformRatePerSecond": 0.2,
    "malePayPerSecond": 0.7,
    "callerCoinBalance": 840,
    "isAgencyFemale": false,
    "receiverLevel": 1,
    "levelConfig": {
      "audioRatePerMinute": 30,
      "videoRatePerMinute": 40,
      "platformMarginPerMinute": 10
    }
  }
}
```

#### POST /male-user/calls/end
Ends an ongoing call and calculates costs.

**Request Body:**
```json
{
  "receiverId": "female_user_id",
  "duration": 180,
  "callType": "audio|video",
  "callId": "call_session_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "callId": "call_history_id",
    "duration": 180,
    "billableDuration": 180,
    "femaleEarningPerSecond": 0.5,
    "platformMarginPerSecond": 0.2,
    "totalCoins": 126,
    "coinsDeducted": 126,
    "femaleEarning": 90,
    "platformMargin": 36,
    "callerRemainingBalance": 714,
    "receiverNewBalance": 1090,
    "ratingRequired": true
  }
}
```

#### GET /male-user/calls/active
Gets the active call for the logged-in male user.

**Response:**
```json
{
  "success": true,
  "data": {
    "callId": "call_session_id",
    "receiverId": "female_user_id",
    "callType": "audio",
    "startedAt": "timestamp"
  }
}
```

#### GET /male-user/calls/history
Gets the call history for the logged-in male user.

**Query Parameters:**
- `limit` (optional): Items per page (default: 50)
- `skip` (optional): Skip items (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "female_user_id",
      "name": "Female Name",
      "profileImage": "image_url",
      "callType": "audio",
      "status": "completed",
      "billableDuration": 180,
      "femaleEarningPerMinute": 30,
      "rating": "Good",
      "createdAt": "timestamp",
      "callId": "call_history_id"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "skip": 0
  }
}
```

#### GET /male-user/calls/stats
Gets call statistics for the logged-in male user.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 10,
    "totalDuration": 1800,
    "totalCoinsSpent": 1260
  }
}
```

### Female User Call Endpoints

#### GET /female-user/calls/history
Gets call history for the logged-in female user.

**Query Parameters:**
- `limit` (optional): Items per page (default: 50)
- `skip` (optional): Skip items (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "male_user_id",
      "name": "Male Name",
      "profileImage": "image_url",
      "callType": "audio",
      "status": "completed",
      "billableDuration": 180,
      "femaleEarningPerMinute": 30,
      "rating": "Good",
      "createdAt": "timestamp",
      "callId": "call_history_id"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "skip": 0
  }
}
```

#### GET /female-user/calls/stats
Gets call statistics for the logged-in female user.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 15,
    "totalDuration": 2700,
    "totalCoinsSpent": 0,
    "totalEarnings": 1350
  }
}
```

#### POST /female-user/calls/end
Ends a call that the female user is receiving.

**Request Body:**
```json
{
  "callerId": "male_user_id",
  "duration": 180,
  "callType": "audio|video",
  "callId": "call_session_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "callId": "call_history_id",
    "duration": 180,
    "billableDuration": 180,
    "femaleEarningPerSecond": 0.5,
    "platformMarginPerSecond": 0.2,
    "totalCoins": 126,
    "coinsDeducted": 126,
    "femaleEarning": 90,
    "platformMargin": 36,
    "callerRemainingBalance": 714,
    "receiverNewBalance": 1090,
    "ratingRequired": true
  }
}
```

#### POST /female-user/calls/rate
Submits a rating for a completed call.

**Request Body:**
```json
{
  "callId": "call_history_id",
  "stars": 4
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "stars": 4,
    "message": "Good"
  }
}
```

## Call Flow

### Complete Call Process

1. **Call Initiation**
   - Male user sends POST request to `/male-user/calls/start`
   - System validates female user exists, is online, and male has sufficient coins
   - Checks block lists to ensure no blocking between users
   - Gets level configuration and calculates rates
   - Creates a CallSession record with frozen rates to prevent rate changes during call
   - Returns call session ID and maximum possible duration

2. **Call Start**
   - System validates the CallSession is active
   - Call begins between users

3. **Call Duration Tracking**
   - System tracks call duration in seconds (frontend typically handles this)
   - Rates are frozen from the CallSession (no rate changes during active call)

4. **Call End**
   - Male user sends POST request to `/male-user/calls/end` or female user sends to `/female-user/calls/end`
   - System validates call session exists and is active
   - Calculates final duration and costs based on frozen rates
   - Updates call record with duration, costs, and status 'completed'
   - Processes coin transfers:
     - Debits coins from male user (atomic operation to prevent race conditions)
     - Credits earnings to female user's wallet balance
     - Updates agency wallet if applicable
   - Marks CallSession as inactive

5. **Transaction Recording**
   - Creates transaction records for both users
   - Creates admin earning record for platform margin
   - Updates agency wallet and creates transaction if applicable

6. **Rating (Optional)**
   - Female user can rate the call with stars (1-5)
   - Rating is recorded in CallHistory

### Rate Freezing Mechanism

The system uses CallSession to freeze rates at call start:
- **femaleRatePerSecond**: Rate at which female earns per second
- **platformRatePerSecond**: Platform commission per second
- **malePayPerSecond**: Total cost per second for male user
- These rates are preserved in the session and used when ending the call
- Prevents rate changes during active calls that could cause discrepancies

### Minimum Billable Duration

- Calls shorter than 30 seconds are billed as 30 seconds
- Ensures minimum earning for female users
- Applied both for start validation and final billing

### Security & Validation

- All endpoints require authentication
- Call access is validated by user ID ownership
- Coin balance is checked before call start
- Rate changes are prevented during active calls via CallSession
- Duplicate active sessions per caller are prevented
- Block list validation prevents calls between blocked users

### Error Handling

- Insufficient coins for call start
- Call session not found or expired
- User not found
- Unauthorized access
- Database errors
- Rate configuration not found