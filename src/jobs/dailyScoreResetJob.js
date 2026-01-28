const FemaleUser = require('../models/femaleUser/FemaleUser');
const { acquireLock, releaseLock } = require('../utils/cronLock');

/**
 * Lightweight daily job to reset daily scores only
 * Does NOT calculate rewards - that's handled real-time
 */
exports.resetDailyScores = async () => {
  const jobName = 'daily-score-reset';
  
  // Acquire lock to prevent concurrent execution
  const lock = await acquireLock(jobName);
  if (!lock) {
    return { success: false, message: 'Daily score reset job is already running' };
  }
  
  try {
    console.log('Starting daily score reset...');
    
    // Reset daily scores for all active users
    const result = await FemaleUser.updateMany(
      { status: 'active', reviewStatus: 'accepted' },
      { dailyScore: 0 }
    );
    
    console.log(`Daily score reset completed. Reset ${result.modifiedCount} users.`);
    return { 
      success: true, 
      message: 'Daily scores reset successfully',
      resetCount: result.modifiedCount
    };
    
  } catch (err) {
    console.error('Error in daily score reset:', err);
    return { success: false, error: err.message };
  } finally {
    // Always release the lock
    await releaseLock(jobName);
  }
};

// For manual execution
if (require.main === module) {
  const connectDB = require('../config/db');
  
  const main = async () => {
    try {
      console.log('Connecting to database...');
      await connectDB();
      console.log('Database connected successfully');
      
      const result = await exports.resetDailyScores();
      console.log('Daily score reset result:', result);
      
      process.exit(0);
    } catch (error) {
      console.error('Error in daily score reset job:', error);
      process.exit(1);
    }
  };
  
  main();
}