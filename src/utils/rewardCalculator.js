const DailyReward = require('../models/admin/DailyReward');
const WeeklyReward = require('../models/admin/WeeklyReward');
const PendingReward = require('../models/common/PendingReward');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const Transaction = require('../models/common/Transaction');

/**
 * Calculate and create pending daily rewards for all female users
 */
exports.calculateDailyRewards = async () => {
  try {
    // Get all female users
    const femaleUsers = await FemaleUser.find({ 
      status: 'active',
      reviewStatus: 'accepted'
    });
    
    // Get all daily reward configurations
    const dailyRewards = await DailyReward.find().sort({ minWalletBalance: -1 });
    
    for (const user of femaleUsers) {
      try {
        // Check if user already has a pending daily reward for today
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const existingPending = await PendingReward.findOne({
          userId: user._id,
          type: 'daily',
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        });
        
        if (existingPending) {
          // Skip if already has pending reward
          continue;
        }
        
        // Check if user's wallet balance meets any reward threshold
        const walletBalance = user.walletBalance || 0;
        
        // Skip users with zero or negative wallet balance
        if (walletBalance <= 0) {
          continue; // Skip users with zero or negative balance
        }        
        // Find the highest reward threshold that the user qualifies for
        let qualifiedReward = null;
        for (const reward of dailyRewards) {
          if (walletBalance >= reward.minWalletBalance) {
            qualifiedReward = reward;
            break;
          }
        }
        
        if (qualifiedReward) {
          // Create pending reward
          await PendingReward.create({
            userId: user._id,
            type: 'daily',
            earningValue: walletBalance,
            rewardAmount: qualifiedReward.rewardAmount
          });
        }      } catch (err) {
        console.error(`Error calculating daily reward for user ${user._id}:`, err);
      }
    }
    
    return { success: true, message: 'Daily rewards calculation completed' };
  } catch (err) {
    console.error('Error in calculateDailyRewards:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Calculate and create pending weekly rewards for all female users
 */
exports.calculateWeeklyRewards = async () => {
  try {
    // Calculate this week's date range (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    
    // Adjust to get Monday of this week
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Check if we already have pending weekly rewards for this week
    const existingPending = await PendingReward.findOne({
      type: 'weekly',
      createdAt: {
        $gte: startOfWeek,
        $lt: endOfWeek
      }
    });
    
    if (existingPending) {
      // Skip if already has pending rewards for this week
      return { success: true, message: 'Weekly rewards already calculated for this week' };
    }
    
    // Get all female users
    const femaleUsers = await FemaleUser.find({ 
      status: 'active',
      reviewStatus: 'accepted'
    });
    
    // Calculate weekly earnings for each user
    const userEarnings = [];
    
    for (const user of femaleUsers) {
      try {
        const transactions = await Transaction.find({
          userId: user._id,
          userType: 'female',
          action: 'credit',
          createdAt: {
            $gte: startOfWeek,
            $lt: endOfWeek
          }
        });
        
        const weeklyEarning = transactions.reduce((sum, t) => sum + t.amount, 0);
        
        if (weeklyEarning > 0) {
          userEarnings.push({
            userId: user._id,
            earning: weeklyEarning
          });
        }
      } catch (err) {
        console.error(`Error calculating weekly earning for user ${user._id}:`, err);
      }
    }
    
    // Sort users by earnings (descending)
    userEarnings.sort((a, b) => b.earning - a.earning);
    
    // Assign ranks and create pending rewards
    for (let i = 0; i < userEarnings.length; i++) {
      try {
        const rank = i + 1;
        const userEarning = userEarnings[i];
        
        // Find reward for this rank
        const rewardSlab = await WeeklyReward.findOne({ rank });
        
        if (rewardSlab) {
          // Create pending reward
          await PendingReward.create({
            userId: userEarning.userId,
            type: 'weekly',
            earningValue: userEarning.earning,
            rewardAmount: rewardSlab.rewardAmount
          });
        }
      } catch (err) {
        console.error(`Error creating pending reward for rank ${i + 1}:`, err);
      }
    }
    
    return { success: true, message: 'Weekly rewards calculation completed' };
  } catch (err) {
    console.error('Error in calculateWeeklyRewards:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get user's reward history
 */
exports.getUserRewardHistory = async (userId) => {
  try {
    const history = await PendingReward.find({ 
      userId,
      status: { $in: ['approved', 'rejected'] }
    }).sort({ createdAt: -1 });
    
    return { success: true, data: history };
  } catch (err) {
    return { success: false, error: err.message };
  }
};