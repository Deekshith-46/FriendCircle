const DailyReward = require('../../models/admin/DailyReward');
const WeeklyReward = require('../../models/admin/WeeklyReward');
const PendingReward = require('../../models/common/PendingReward');
const RewardHistory = require('../../models/common/RewardHistory');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const Transaction = require('../../models/common/Transaction');
const rewardCalculator = require('../../utils/rewardCalculator');

// Create or update daily reward slab
exports.createDailyReward = async (req, res) => {
  try {
    const { minWalletBalance, rewardAmount } = req.body;

    // Validate input
    if (minWalletBalance === undefined || rewardAmount === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'minWalletBalance and rewardAmount are required' 
      });
    }

    // Validate that minWalletBalance is greater than 0 to prevent rewarding users with zero balance
    if (minWalletBalance <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'minWalletBalance must be greater than 0' 
      });
    }

    const dailyReward = new DailyReward({
      minWalletBalance,
      rewardAmount
    });

    await dailyReward.save();

    return res.json({ 
      success: true, 
      message: 'Daily reward created successfully',
      data: dailyReward
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};// Get all daily rewards
exports.getDailyRewards = async (req, res) => {
  try {
    const rewards = await DailyReward.find().sort({ minWalletBalance: 1 });
    return res.json({ success: true, data: rewards });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
// Update daily reward
exports.updateDailyReward = async (req, res) => {
  try {
    const { id } = req.params;
    const { minWalletBalance, rewardAmount } = req.body;

    // Build update object with only provided fields
    const updateObj = {};
    if (minWalletBalance !== undefined) {
      // Validate that minWalletBalance is greater than 0 to prevent rewarding users with zero balance
      if (minWalletBalance <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'minWalletBalance must be greater than 0' 
        });
      }
      updateObj.minWalletBalance = minWalletBalance;
    }
    if (rewardAmount !== undefined) updateObj.rewardAmount = rewardAmount;

    // If no fields provided, return error
    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one field (minWalletBalance or rewardAmount) is required' 
      });
    }

    const updatedReward = await DailyReward.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    if (!updatedReward) {
      return res.status(404).json({ 
        success: false, 
        message: 'Daily reward not found' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'Daily reward updated successfully',
      data: updatedReward
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};// Delete daily reward
exports.deleteDailyReward = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedReward = await DailyReward.findByIdAndDelete(id);
    
    if (!deletedReward) {
      return res.status(404).json({ 
        success: false, 
        message: 'Daily reward not found' 
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Daily reward deleted successfully'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Create or update weekly reward
exports.createWeeklyReward = async (req, res) => {
  try {
    const { rank, rewardAmount } = req.body;

    // Validate input
    if (rank === undefined || rewardAmount === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'rank and rewardAmount are required' 
      });
    }

    // Check if there's an existing reward with the same rank
    const existingReward = await WeeklyReward.findOne({ rank });
    
    if (existingReward) {
      return res.status(400).json({ 
        success: false, 
        message: 'A reward with this rank already exists' 
      });
    }

    const weeklyReward = new WeeklyReward({
      rank,
      rewardAmount
    });

    await weeklyReward.save();

    return res.json({ 
      success: true, 
      message: 'Weekly reward created successfully',
      data: weeklyReward
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get all weekly rewards
exports.getWeeklyRewards = async (req, res) => {
  try {
    const rewards = await WeeklyReward.find().sort({ rank: 1 });
    return res.json({ success: true, data: rewards });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update weekly reward
exports.updateWeeklyReward = async (req, res) => {
  try {
    const { id } = req.params;
    const { rank, rewardAmount } = req.body;

    // Build update object with only provided fields
    const updateObj = {};
    if (rank !== undefined) updateObj.rank = rank;
    if (rewardAmount !== undefined) updateObj.rewardAmount = rewardAmount;

    // If no fields provided, return error
    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one field (rank or rewardAmount) is required' 
      });
    }

    // If updating rank, validate uniqueness
    if (rank !== undefined) {
      // Check if there's an existing reward (other than the one being updated) with the same rank
      const existingReward = await WeeklyReward.findOne({
        _id: { $ne: id },
        rank: rank
      });

      if (existingReward) {
        return res.status(400).json({ 
          success: false, 
          message: 'A reward with this rank already exists' 
        });
      }
    }

    const updatedReward = await WeeklyReward.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    if (!updatedReward) {
      return res.status(404).json({ 
        success: false, 
        message: 'Weekly reward not found' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'Weekly reward updated successfully',
      data: updatedReward
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete weekly reward
exports.deleteWeeklyReward = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedReward = await WeeklyReward.findByIdAndDelete(id);
    
    if (!deletedReward) {
      return res.status(404).json({ 
        success: false, 
        message: 'Weekly reward not found' 
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Weekly reward deleted successfully'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get pending rewards
exports.getPendingRewards = async (req, res) => {
  try {
    const { type, limit = 50, skip = 0 } = req.query;
    
    const filter = { status: 'pending' };
    if (type && ['daily', 'weekly'].includes(type)) {
      filter.type = type;
    }
    
    // Get all pending rewards first
    let pendingRewards = await PendingReward.find(filter)
      .populate('userId', 'name email walletBalance')
      .sort({ createdAt: -1 });
    
    // For daily rewards, filter out users who no longer qualify based on current wallet balance
    if (type === 'daily') {
      // Get all daily reward configurations
      const dailyRewards = await DailyReward.find().sort({ minWalletBalance: 1 });
      
      pendingRewards = pendingRewards.filter(reward => {
        // Skip rewards for users with no user data
        if (!reward.userId) return false;
        
        // Find the appropriate reward rule for this reward amount
        const rewardRule = dailyRewards.find(rule => rule.rewardAmount === reward.rewardAmount);
        
        // If we can't find the rule, exclude this reward
        if (!rewardRule) return false;
        
        // Only include rewards where user's current wallet balance >= the reward rule's minimum threshold
        return reward.userId.walletBalance >= rewardRule.minWalletBalance;
      });
    }
    
    // Apply pagination after filtering
    const total = pendingRewards.length;
    pendingRewards = pendingRewards.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
    
    return res.json({ 
      success: true, 
      data: pendingRewards,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};// Approve pending reward
exports.approvePendingReward = async (req, res) => {
  try {
    const { id } = req.params;
    const note = req.body?.note || '';
    const adminId = req.admin._id;    
    // Find the pending reward
    const pendingReward = await PendingReward.findById(id);
    if (!pendingReward) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pending reward not found' 
      });
    }
    
    if (pendingReward.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Reward is not in pending status' 
      });
    }
    
    // Update user's wallet balance
    const user = await FemaleUser.findById(pendingReward.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    user.walletBalance = (user.walletBalance || 0) + pendingReward.rewardAmount;
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      userType: 'female',
      userId: user._id,
      operationType: 'wallet',
      action: 'credit',
      amount: pendingReward.rewardAmount,
      earningType: 'other',
      message: `Reward approved (${pendingReward.type}): ${pendingReward.rewardAmount}`,
      balanceAfter: user.walletBalance,
      createdBy: adminId
    });
    
    // Update pending reward status
    pendingReward.status = 'approved';
    pendingReward.updatedAt = new Date();
    await pendingReward.save();
    
    // Create reward history entry
    await RewardHistory.create({
      userId: user._id,
      type: pendingReward.type,
      rewardAmount: pendingReward.rewardAmount,
      status: 'approved',
      adminId,
      note: note || `Approved ${pendingReward.type} reward`
    });
    
    return res.json({ 
      success: true, 
      message: 'Reward approved successfully',
      data: pendingReward
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Reject pending reward
exports.rejectPendingReward = async (req, res) => {
  try {
    const { id } = req.params;
    const note = req.body?.note || '';
    const adminId = req.admin._id;
    // Find the pending reward
    const pendingReward = await PendingReward.findById(id);
    if (!pendingReward) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pending reward not found' 
      });
    }
    
    if (pendingReward.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Reward is not in pending status' 
      });
    }
    
    // Update pending reward status
    pendingReward.status = 'rejected';
    pendingReward.updatedAt = new Date();
    await pendingReward.save();
    
    // Create reward history entry
    await RewardHistory.create({
      userId: pendingReward.userId,
      type: pendingReward.type,
      rewardAmount: pendingReward.rewardAmount,
      status: 'rejected',
      adminId,
      note: note || `Rejected ${pendingReward.type} reward`
    });
    
    return res.json({ 
      success: true, 
      message: 'Reward rejected successfully',
      data: pendingReward
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get reward history
exports.getRewardHistory = async (req, res) => {
  try {
    const { type, status, limit = 50, skip = 0 } = req.query;
    
    const filter = {};
    if (type && ['daily', 'weekly'].includes(type)) {
      filter.type = type;
    }
    if (status && ['approved', 'rejected'].includes(status)) {
      filter.status = status;
    }
    
    const rewardHistory = await RewardHistory.find(filter)
      .populate('userId', 'name email')
      .populate('adminId', 'name email')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
      
    const total = await RewardHistory.countDocuments(filter);
    
    return res.json({ 
      success: true, 
      data: rewardHistory,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Manually trigger daily reward calculation
exports.triggerDailyRewards = async (req, res) => {
  try {
    const result = await rewardCalculator.calculateDailyRewards();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Manually trigger weekly reward calculation
exports.triggerWeeklyRewards = async (req, res) => {
  try {
    const result = await rewardCalculator.calculateWeeklyRewards();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
