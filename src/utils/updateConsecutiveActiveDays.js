const FemaleUser = require('../models/femaleUser/FemaleUser');

/**
 * Update consecutive active days for a female user
 * This should be called on first login/app open of each day
 * @param {String} userId - Female user ID
 */
exports.updateConsecutiveActiveDays = async (userId) => {
  try {
    const user = await FemaleUser.findById(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastActiveDate = null;
    if (user.lastActiveDate) {
      lastActiveDate = new Date(user.lastActiveDate);
      lastActiveDate.setHours(0, 0, 0, 0);
    }

    // Only update if this is the first activity of the day
    const isFirstActivityToday = !lastActiveDate || lastActiveDate.getTime() < today.getTime();
    
    if (isFirstActivityToday) {
      let newConsecutiveDays = 1;
      
      // If user was active yesterday, increment the streak
      if (lastActiveDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActiveDate.getTime() === yesterday.getTime()) {
          // Consecutive day - increment streak
          newConsecutiveDays = (user.consecutiveActiveDays || 0) + 1;
        }
        // If gap in activity, reset to 1 (already set above)
      }
      
      // Update user with new consecutive days count and today's date
      await FemaleUser.findByIdAndUpdate(userId, {
        consecutiveActiveDays: newConsecutiveDays,
        lastActiveDate: new Date()
      });
      
      return {
        success: true,
        consecutiveActiveDays: newConsecutiveDays,
        message: `Updated consecutive active days to ${newConsecutiveDays}`
      };
    }
    
    return {
      success: true,
      consecutiveActiveDays: user.consecutiveActiveDays,
      message: 'Already counted for today - no update needed'
    };
    
  } catch (err) {
    console.error('Error updating consecutive active days:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Get user's current consecutive active days streak
 * @param {String} userId - Female user ID
 */
exports.getConsecutiveActiveDays = async (userId) => {
  try {
    const user = await FemaleUser.findById(userId).select('consecutiveActiveDays lastActiveDate');
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return {
      success: true,
      consecutiveActiveDays: user.consecutiveActiveDays || 0,
      lastActiveDate: user.lastActiveDate
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};