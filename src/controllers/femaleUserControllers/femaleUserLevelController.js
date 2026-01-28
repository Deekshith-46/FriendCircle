const FemaleUser = require('../../models/femaleUser/FemaleUser');
const AdminLevelConfig = require('../../models/admin/AdminLevelConfig');
const CallHistory = require('../../models/common/CallHistory');
const messages = require('../../validations/messages');

// Get female user's level information and fixed rates
exports.getLevelInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await FemaleUser.findById(userId).select('currentLevel audioCoinsPerMinute videoCoinsPerMinute weeklyEarnings');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Get the level configuration for the user's current level
    const levelConfig = await AdminLevelConfig.findOne({ 
      level: user.currentLevel, 
      isActive: true 
    });
    
    if (!levelConfig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Level configuration not found for current level' 
      });
    }
    
    // Calculate weekly earnings if not already updated
    const weeklyEarnings = await calculateWeeklyEarnings(userId);
    
    return res.json({
      success: true,
      data: {
        currentLevel: user.currentLevel,
        weeklyEarnings: weeklyEarnings,
        audioRate: user.audioCoinsPerMinute,
        videoRate: user.videoCoinsPerMinute,
        fixedAudioRate: levelConfig.audioRatePerMinute,
        fixedVideoRate: levelConfig.videoRatePerMinute,
        levelConfig: {
          weeklyEarningsMin: levelConfig.weeklyEarningsMin,
          weeklyEarningsMax: levelConfig.weeklyEarningsMax
        }
      }
    });
  } catch (err) {
    console.error('Error in getLevelInfo:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update call rates - INTERNAL USE ONLY
// Rates are automatically updated based on level assignment
// This endpoint should only be called by admin or internal processes
exports.updateCallRates = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Get the level configuration for the user's current level
    const levelConfig = await AdminLevelConfig.findOne({ 
      level: user.currentLevel, 
      isActive: true 
    });
    
    if (!levelConfig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Level configuration not found for current level' 
      });
    }
    
    // Update the user's rates to match the level configuration
    user.audioCoinsPerMinute = levelConfig.audioRatePerMinute;
    user.videoCoinsPerMinute = levelConfig.videoRatePerMinute;
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Call rates synchronized with level configuration',
      data: {
        currentLevel: user.currentLevel,
        audioCoinsPerMinute: user.audioCoinsPerMinute,
        videoCoinsPerMinute: user.videoCoinsPerMinute
      }
    });
  } catch (err) {
    console.error('Error in updateCallRates:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Calculate and update user's level based on weekly earnings - DEPRECATED
// Now handled by weekly cron job
exports.calculateLevel = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Level calculation is now handled automatically by the weekly job. This endpoint is deprecated.'
  });
};

// Calculate weekly earnings for a user
const calculateWeeklyEarnings = async (userId) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(0, 0, 0, 0);
  
  const earnings = await CallHistory.aggregate([
    {
      $match: {
        receiverId: userId,
        createdAt: { $gte: startOfWeek, $lt: endOfWeek },
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

// Get all available levels for display (for UI)
exports.getAllLevels = async (req, res) => {
  try {
    const levels = await AdminLevelConfig.find({ isActive: true }).sort({ level: 1 });
    
    // Get current user's level if authenticated
    let currentUserLevel = null;
    if (req.user) {
      const user = await FemaleUser.findById(req.user._id).select('currentLevel');
      if (user) {
        currentUserLevel = user.currentLevel;
      }
    }
    
    return res.json({
      success: true,
      data: {
        levels: levels,
        currentUserLevel: currentUserLevel
      }
    });
  } catch (err) {
    console.error('Error in getAllLevels:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get user's call rate settings with level info
exports.getCallRateSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await FemaleUser.findById(userId).select('currentLevel audioCoinsPerMinute videoCoinsPerMinute weeklyEarnings');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Get all level configurations
    const levelConfigs = await AdminLevelConfig.find({ isActive: true }).sort({ level: 1 });
    
    // Get current level config
    const currentLevelConfig = levelConfigs.find(config => config.level === user.currentLevel);
    
    // Calculate weekly earnings
    const weeklyEarnings = await calculateWeeklyEarnings(userId);
    
    return res.json({
      success: true,
      data: {
        currentLevel: user.currentLevel,
        weeklyEarnings: weeklyEarnings,
        audioCoinsPerMinute: user.audioCoinsPerMinute,
        videoCoinsPerMinute: user.videoCoinsPerMinute,
        currentLevelConfig: {
          ...currentLevelConfig._doc,
          // Add platform margin information
          platformMargin: currentLevelConfig.platformMarginPerMinute
        },
        allLevels: levelConfigs
      }
    });
  } catch (err) {
    console.error('Error in getCallRateSettings:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};