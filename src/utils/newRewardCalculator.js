const AdminRewardRule = require('../models/admin/AdminRewardRule');
const ScoreHistory = require('../models/common/ScoreHistory');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const { acquireLock, releaseLock, didRunToday } = require('./cronLock');

/**
 * Calculate and apply daily rewards based on rules
 */
exports.calculateDailyRewards = async () => {
  // Daily rewards cron is now DISABLED
  // All real-time rewards (login, call targets) are handled immediately
  // Only weekly consistency remains for cron processing
  console.log('Daily rewards cron disabled - using real-time rewards');
  return { success: true, message: 'Real-time rewards enabled, daily cron disabled' };
};

/**
 * Calculate and apply weekly rewards based on rules
 */
exports.calculateWeeklyRewards = async () => {
  const jobName = 'weekly-rewards';
  
  // Acquire lock to prevent concurrent execution
  const lock = await acquireLock(jobName);
  if (!lock) {
    return { success: false, message: 'Weekly rewards job is already running' };
  }
  
  try {
    // Calculate this week's date range (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    
    // Adjust to get Monday of this week
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get all active female users
    const femaleUsers = await FemaleUser.find({ 
      status: 'active',
      reviewStatus: 'accepted'
    });

    // Get all active weekly reward rules
    const weeklyRules = await AdminRewardRule.find({ 
      isActive: true
    });
    
    // Filter rules that are meant for weekly evaluation
    const weeklyApplicableRules = weeklyRules.filter(rule => {
      return [
        'WEEKLY_CONSISTENCY'
      ].includes(rule.ruleType);
    });
    
    // Pre-fetch this week's score history to avoid N+1 queries
    const weekRewards = await ScoreHistory.find({
      referenceDate: {
        $gte: startOfWeek
      },
      ruleType: { $in: weeklyApplicableRules.map(r => r.ruleType) }
    }).select('femaleUserId ruleType');
    
    // Create lookup map for O(1) checking
    const weekRewardsMap = new Map();
    weekRewards.forEach(reward => {
      const key = `${reward.femaleUserId}-${reward.ruleType}`;
      weekRewardsMap.set(key, true);
    });
    
    // Reset weekly scores for all users (at the beginning of the week)
    await FemaleUser.updateMany({}, { 
      weeklyScore: 0
    });
    
    for (const user of femaleUsers) {
      for (const rule of weeklyApplicableRules) {
        try {
          // Check if user already received this reward this week using pre-fetched map
          const rewardKey = `${user._id}-${rule.ruleType}`;
          if (weekRewardsMap.has(rewardKey)) {
            continue; // Skip if already rewarded this week for this rule
          }

          let conditionMet = false;
          
          // Check if rule condition is satisfied based on rule type
          if (rule.ruleType === 'WEEKLY_CONSISTENCY') {
            // Check if user has required consecutive active days
            conditionMet = (user.consecutiveActiveDays || 0) >= (rule.requiredDays || 7);
          }
          
          if (conditionMet) {
            // Apply score to weekly and total scores (not daily)
            await FemaleUser.findByIdAndUpdate(user._id, {
              $inc: {
                weeklyScore: rule.scoreValue,
                score: rule.scoreValue  // totalScore
              }
            });

            // Log the score history with normalized referenceDate
            const normalizedReferenceDate = new Date(startOfWeek);
            normalizedReferenceDate.setHours(0, 0, 0, 0);
            
            await ScoreHistory.create({
              femaleUserId: user._id,
              ruleType: rule.ruleType,
              scoreAdded: rule.scoreValue,
              referenceDate: normalizedReferenceDate,
              ruleId: rule._id,
              addedBy: 'system'
            });
          }
        } catch (err) {
          console.error(`Error applying weekly rule ${rule._id} for user ${user._id}:`, err);
        }
      }
    }
    
    // Do NOT reset consecutiveActiveDays as it tracks behavioral patterns

    return { success: true, message: 'Weekly rewards calculation completed' };
  } catch (err) {
    console.error('Error in calculateWeeklyRewards:', err);
    return { success: false, error: err.message };
  } finally {
    // Always release the lock
    await releaseLock(jobName);
  }
};



/**
 * Get user's score history
 */
exports.getUserScoreHistory = async (userId) => {
  try {
    const history = await ScoreHistory.find({ 
      femaleUserId: userId
    }).populate('ruleId').sort({ createdAt: -1 });
    
    return { success: true, data: history };
  } catch (err) {
    return { success: false, error: err.message };
  }
};