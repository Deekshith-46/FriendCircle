const rewardCalculator = require('../utils/newRewardCalculator');
const connectDB = require('../config/db');

/**
 * Manual reward calculation script
 * This can be run via command line or scheduled task
 */

const runDailyRewards = async () => {
  console.log('Starting daily rewards calculation...');
  const result = await rewardCalculator.calculateDailyRewards();
  console.log('Daily rewards calculation result:', result);
  return result;
};

const runWeeklyRewards = async () => {
  console.log('Starting weekly rewards calculation...');
  const result = await rewardCalculator.calculateWeeklyRewards();
  console.log('Weekly rewards calculation result:', result);
  return result;
};

// Main execution function
const main = async () => {
  try {
    // Connect to database first
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--daily')) {
      await runDailyRewards();
    } else if (args.includes('--weekly')) {
      await runWeeklyRewards();
    } else {
      console.log('Usage: node rewardJob.js [--daily|--weekly]');
      console.log('  --daily: Calculate daily rewards for all users');
      console.log('  --weekly: Calculate weekly rewards for all users');
    }
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error in reward job:', error);
    process.exit(1);
  }
};

// Run the main function
main();