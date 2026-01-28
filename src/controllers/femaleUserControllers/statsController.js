const FemaleUser = require('../../models/femaleUser/FemaleUser');
const Transaction = require('../../models/common/Transaction');
const CallHistory = require('../../models/common/CallHistory');
const GiftReceived = require('../../models/femaleUser/GiftReceived');
const PendingReward = require('../../models/common/PendingReward');
const RewardHistory = require('../../models/common/RewardHistory');

// Get female user statistics
exports.getFemaleUserStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    // Get user data
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate today's start and end times
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Calculate week's start and end times (Monday to Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Adjust for Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all transactions for this user
    const transactions = await Transaction.find({ 
      userId: userId,
      userType: 'female',
      action: 'credit'
    });

    // Calculate call earnings
    const callEarningsTransactions = transactions.filter(t => t.earningType === 'call');
    const callEarning = callEarningsTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate gift earnings
    const giftEarningsTransactions = transactions.filter(t => t.earningType === 'gift');
    const giftEarning = giftEarningsTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate other earnings
    const otherEarningsTransactions = transactions.filter(t => t.earningType === 'other');
    const otherEarning = otherEarningsTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate today's earnings
    const todayTransactions = transactions.filter(t => 
      t.createdAt >= startOfDay && t.createdAt < endOfDay
    );
    const todayEarning = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate this week's earnings
    const weekTransactions = transactions.filter(t => 
      t.createdAt >= startOfWeek && t.createdAt <= endOfWeek
    );
    const weekEarning = weekTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Return the stats
    return res.json({
      success: true,
      data: {
        totalOnlineTime: user.totalOnlineMinutes || 0,
        missedCalls: user.missedCalls || 0,
        weekEarning: weekEarning,
        todayEarning: todayEarning,
        callEarning: callEarning,
        giftEarning: giftEarning,
        otherEarning: otherEarning,
        walletBalance: user.walletBalance || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get female user reward history
exports.getRewardHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;
    
    const history = await RewardHistory.find({ userId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
      
    const total = await RewardHistory.countDocuments({ userId });
    
    return res.json({
      success: true,
      data: history,
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

// Get female user weekly ranking
exports.getWeeklyRanking = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
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
    
    // Get all female users with their weekly earnings
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
        
        // Only include users with earnings > 0
        if (weeklyEarning > 0) {
          userEarnings.push({
            userId: user._id,
            name: user.name,
            earning: weeklyEarning
          });
        }
      } catch (err) {
        console.error(`Error calculating weekly earning for user ${user._id}:`, err);
      }
    }
    
    // Sort users by earnings (descending)
    userEarnings.sort((a, b) => b.earning - a.earning);
    
    // Find current user's data
    const currentUserData = userEarnings.find(u => u.userId.toString() === currentUserId.toString());
    
    if (!currentUserData) {
      // User has no earnings this week
      return res.json({
        success: true,
        myRank: null,
        myWeeklyEarnings: 0,
        nextRankEarnings: userEarnings.length > 0 ? userEarnings[0].earning : 0,
        neededForNextRank: userEarnings.length > 0 ? userEarnings[0].earning : 0,
        leaderboard: userEarnings.slice(0, 10).map((user, index) => ({
          rank: index + 1,
          name: user.name,
          earnings: user.earning
        }))
      });
    }
    
    // Find current user's rank (1-indexed)
    const myRank = userEarnings.findIndex(u => u.userId.toString() === currentUserId.toString()) + 1;
    
    // Get next rank data
    let nextRankEarnings = 0;
    let neededForNextRank = 0;
    
    if (myRank > 1) {
      const nextRankUser = userEarnings[myRank - 2]; // -2 because array is 0-indexed and we want the user ahead
      nextRankEarnings = nextRankUser.earning;
      neededForNextRank = nextRankEarnings - currentUserData.earning;
    }
    
    // Create leaderboard (top 10 users)
    const leaderboard = userEarnings.slice(0, 10).map((user, index) => {
      return {
        rank: index + 1,
        name: user.userId.toString() === currentUserId.toString() ? "YOU" : user.name,
        earnings: user.earning
      };
    });
    
    return res.json({
      success: true,
      myRank: myRank,
      myWeeklyEarnings: currentUserData.earning,
      nextRankEarnings: nextRankEarnings,
      neededForNextRank: neededForNextRank,
      leaderboard: leaderboard
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Increment missed calls for a female user
exports.incrementMissedCalls = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { $inc: { missedCalls: 1 } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    return res.json({
      success: true,
      message: 'Missed calls incremented',
      data: {
        missedCalls: user.missedCalls
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};