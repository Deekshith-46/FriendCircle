const MaleBlockList = require('../models/maleUser/BlockList');
const FemaleBlockList = require('../models/femaleUser/BlockList');
const AgencyBlockList = require('../models/agency/BlockList');
const messages = require('../validations/messages');
const { isBlocked } = require('../services/blockService');

// Middleware to check if users have blocked each other
const checkBlockStatus = async (userId, targetUserId, userType, targetUserType) => {
  try {
    // Use the new block service
    const result = await isBlocked(userId, userType, targetUserId, targetUserType);
    
    return {
      userBlockedTarget: result.userBlockedOther,
      targetBlockedUser: result.otherBlockedUser,
      isBlocked: result.isBlocked
    };
  } catch (err) {
    console.error('Error checking block status:', err);
    return {
      userBlockedTarget: false,
      targetBlockedUser: false,
      isBlocked: false,
      error: err.message
    };
  }
};

// Middleware to prevent blocked users from interacting
const preventBlockedInteraction = async (req, res, next) => {
  try {
    // Skip check for certain routes that don't involve user interactions
    const skipRoutes = [
      '/block',
      '/unblock',
      '/block-list',
      '/toggle-online-status'
    ];
    
    const fullPath = req.originalUrl;
    if (skipRoutes.some(route => fullPath.includes(route))) {
      return next();
    }
    
    // Check if req.user exists (authenticated user)
    if (!req.user) {
      return next(); // No authenticated user, continue
    }
    
    // Get target user ID from request body or params
    const targetUserId = req.body.femaleUserId || req.body.maleUserId || req.body.receiverId || req.params.userId;
    
    if (!targetUserId) {
      return next(); // No target user specified, continue
    }
    
    // Check if we have the required user information
    if (!req.user._id || !req.userType) {
      return next(); // Missing required user information, continue
    }
    
    // Determine target user type
    let targetUserType = 'female'; // Default assumption
    if (req.body.maleUserId) {
      targetUserType = 'male';
    } else if (req.body.receiverId) {
      // For chat, we assume the receiver is a female user
      targetUserType = 'female';
    }
    
    // Check block status
    const blockStatus = await checkBlockStatus(
      req.user._id, 
      targetUserId, 
      req.userType,
      targetUserType
    );
    
    if (blockStatus.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: messages.BLOCK.BLOCKED_CANNOT_INTERACT 
      });
    }
    
    next();
  } catch (err) {
    console.error('Error in block middleware:', err);
    next();
  }
};

module.exports = {
  checkBlockStatus,
  preventBlockedInteraction
};