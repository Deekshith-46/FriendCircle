const FemaleUser = require('../models/femaleUser/FemaleUser');

/**
 * Update consecutive active days for a user
 * Call this when user logs in or opens app
 */
exports.updateConsecutiveActiveDays = async (userId) => {
  try {
    const user = await FemaleUser.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let newConsecutiveDays = 1;
    
    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);
      
      // Calculate difference in days
      const timeDiff = today.getTime() - lastActive.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        // Consecutive day
        newConsecutiveDays = (user.consecutiveActiveDays || 0) + 1;
      } else if (dayDiff === 0) {
        // Same day - don't increment
        newConsecutiveDays = user.consecutiveActiveDays || 0;
      } else {
        // Gap in days - reset to 1
        newConsecutiveDays = 1;
      }
    }

    await FemaleUser.findByIdAndUpdate(userId, {
      lastActiveDate: new Date(),
      consecutiveActiveDays: newConsecutiveDays
    });

    return { success: true, consecutiveActiveDays: newConsecutiveDays };
  } catch (err) {
    console.error('Error updating consecutive active days:', err);
    return { success: false, error: err.message };
  }
};