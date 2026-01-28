require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const AdminLevelConfig = require('../models/admin/AdminLevelConfig');
const CallHistory = require('../models/common/CallHistory');

/**
 * Weekly level assignment job
 * Automatically assigns levels to female users based on their weekly earnings
 */

// Validate that level ranges don't overlap and don't have gaps
const validateLevelRanges = (levelConfigs) => {
  if (levelConfigs.length === 0) return;
  
  // Sort by weeklyEarningsMin
  const sortedConfigs = [...levelConfigs].sort((a, b) => a.weeklyEarningsMin - b.weeklyEarningsMin);
  
  for (let i = 0; i < sortedConfigs.length - 1; i++) {
    const current = sortedConfigs[i];
    const next = sortedConfigs[i + 1];
    
    // Check for overlap - ranges overlap if currentMax >= nextMin
    // Valid: Level 1: 0-1000, Level 2: 1001-2000 (boundary at 1000 and 1001 - no overlap)
    // Invalid: Level 1: 0-1000, Level 2: 1000-2000 (boundary at 1000 and 1000 - overlap)
    if (current.weeklyEarningsMax >= next.weeklyEarningsMin) {
      throw new Error(
        `Overlapping level ranges detected: Level ${current.level} (${current.weeklyEarningsMin}-${current.weeklyEarningsMax}) ` +
        `overlaps with Level ${next.level} (${next.weeklyEarningsMin}-${next.weeklyEarningsMax})`
      );
    }
    
    // Check for gaps (optional, could be acceptable depending on business logic)
    // Gap exists if there's a range of earnings that doesn't belong to any level
    // Example: Level 1: 0-1000, Level 2: 1002-2000 (gap at 1001)
    if (current.weeklyEarningsMax + 1 < next.weeklyEarningsMin) {
      console.warn(
        `Gap detected between Level ${current.level} (up to ${current.weeklyEarningsMax}) ` +
        `and Level ${next.level} (starting from ${next.weeklyEarningsMin}). ` +
        `Users with earnings in this range (${current.weeklyEarningsMax + 1} to ${next.weeklyEarningsMin - 1}) will stay at default level.`
      );
    }
  }
};

const assignWeeklyLevels = async () => {
  console.log('Starting weekly level assignment...');
  
  try {
    // Get all active level configurations
    const levelConfigs = await AdminLevelConfig.find({ isActive: true }).sort({ level: 1 });
    
    if (levelConfigs.length === 0) {
      console.log('No active level configurations found');
      return { success: false, message: 'No active level configurations found' };
    }
    
    // Validate level ranges to prevent admin configuration errors
    validateLevelRanges(levelConfigs);
    
    // Get all female users
    const femaleUsers = await FemaleUser.find({});
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of femaleUsers) {
      try {
        // Calculate weekly earnings for the user
        const weeklyEarnings = await calculateWeeklyEarnings(user._id);
        
        // Find the appropriate level based on weekly earnings
        let newLevel = 0; // Default to level 0 (starter level) if no match found
        
        for (const config of levelConfigs) {
          if (weeklyEarnings >= config.weeklyEarningsMin && weeklyEarnings <= config.weeklyEarningsMax) {
            newLevel = config.level;
            break;
          }
        }
        
        // Update user's level and weekly earnings if changed
        const levelChanged = user.currentLevel !== newLevel;
        const earningsChanged = user.weeklyEarnings !== weeklyEarnings;
        
        if (levelChanged || earningsChanged) {
          // Update the user's level and weekly earnings only
          user.currentLevel = newLevel;
          user.weeklyEarnings = weeklyEarnings;
          
          // Set the timestamp for when the level was last evaluated
          user.lastLevelEvaluatedAt = new Date();
          
          // Reset weekly earnings to 0 if level changed (to prevent instant level jumping)
          if (levelChanged) {
            user.weeklyEarnings = 0;
          }
          
          await user.save();
          updatedCount++;
          
          console.log(`Updated user ${user._id} level to ${newLevel}, weekly earnings: ${weeklyEarnings}`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user._id}:`, userError);
        errorCount++;
      }
    }
    
    console.log(`Weekly level assignment completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
    return { 
      success: true, 
      updatedCount, 
      errorCount,
      message: `Weekly level assignment completed. Updated: ${updatedCount}, Errors: ${errorCount}` 
    };
    
  } catch (error) {
    console.error('Error in weekly level assignment:', error);
    return { success: false, error: error.message };
  }
};

// Calculate weekly earnings for a user
const calculateWeeklyEarnings = async (userId) => {
  const now = new Date();
  // Calculate the previous complete week (not current week)
  // Start from the beginning of the previous week
  const startOfPreviousWeek = new Date(now);
  startOfPreviousWeek.setDate(now.getDate() - now.getDay() - 7); // Start of previous week (Sunday)
  startOfPreviousWeek.setHours(0, 0, 0, 0);
  
  const endOfPreviousWeek = new Date(startOfPreviousWeek);
  endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 7);
  endOfPreviousWeek.setHours(0, 0, 0, 0);
  
  const earnings = await CallHistory.aggregate([
    {
      $match: {
        receiverId: userId,
        createdAt: { $gte: startOfPreviousWeek, $lt: endOfPreviousWeek },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$femaleEarning' }
      }
    }
  ]);
  
  return earnings.length > 0 ? earnings[0].totalEarnings : 0;
};

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--run')) {
  (async () => {
    try {
      await connectDB();
      const result = await assignWeeklyLevels();
      console.log('Job result:', result);
      process.exit(0);
    } catch (error) {
      console.error('Job failed:', error);
      process.exit(1);
    }
  })();
} else {
  console.log('Usage: node levelAssignmentJob.js [--run]');
  console.log('  --run: Execute the weekly level assignment job');
}

module.exports = {
  assignWeeklyLevels,
  calculateWeeklyEarnings
};