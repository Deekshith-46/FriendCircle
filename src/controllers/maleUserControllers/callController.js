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
        receiverNewBalance: receiver.walletBalance
        // Note: Rating eligibility is determined by frontend via getCallHistory.canRate
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
      
      // Determine if current user can rate this call
      const canRate = (
        call.status === 'completed' &&
        (!call.rating || call.rating.stars == null) &&
        call.receiverId.toString() === userId.toString()
      );
      
      return {
        userId: otherUserId,
        name: userName,
        profileImage: profileImageUrl,
        callType: call.callType,
        status: call.status,
        billableDuration: call.status === 'completed' ? call.billableDuration : 0,
        femaleEarningPerMinute: call.femaleEarningPerMinute,
        rating: (call.rating && call.rating.stars) ? call.rating.message : null,
        canRate: canRate, // New field indicating rating eligibility
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
