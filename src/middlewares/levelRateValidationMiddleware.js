const FemaleUser = require('../models/femaleUser/FemaleUser');
const AdminLevelConfig = require('../models/admin/AdminLevelConfig');

// Middleware to validate that female users can only set rates within their level range
const validateLevelRate = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { audioCoinsPerMinute, videoCoinsPerMinute } = req.body;

    // If no rates are being updated, skip validation
    if (audioCoinsPerMinute === undefined && videoCoinsPerMinute === undefined) {
      return next();
    }

    // Get the female user
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Female user not found' 
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
        message: 'Level configuration not found for your current level' 
      });
    }

    // Validate audio rate if provided
    if (audioCoinsPerMinute !== undefined) {
      if (audioCoinsPerMinute < levelConfig.audioRateRange.min || 
          audioCoinsPerMinute > levelConfig.audioRateRange.max) {
        return res.status(400).json({ 
          success: false, 
          message: `Audio rate must be between ${levelConfig.audioRateRange.min} and ${levelConfig.audioRateRange.max} coins per minute` 
        });
      }
    }

    // Validate video rate if provided
    if (videoCoinsPerMinute !== undefined) {
      if (videoCoinsPerMinute < levelConfig.videoRateRange.min || 
          videoCoinsPerMinute > levelConfig.videoRateRange.max) {
        return res.status(400).json({ 
          success: false, 
          message: `Video rate must be between ${levelConfig.videoRateRange.min} and ${levelConfig.videoRateRange.max} coins per minute` 
        });
      }
    }

    // If validation passes, continue to the next middleware/controller
    next();
  } catch (err) {
    console.error('Error in validateLevelRate middleware:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Error validating rate limits' 
    });
  }
};

module.exports = { validateLevelRate };