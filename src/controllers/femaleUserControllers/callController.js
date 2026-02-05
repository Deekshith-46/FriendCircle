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