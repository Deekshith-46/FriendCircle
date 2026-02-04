// src/controllers/common/notificationController.js
const { saveFCMToken, removeFCMToken, sendPushNotification } = require('../../services/notificationService');

/**
 * Save FCM token for authenticated user
 * @route POST /notification/save-token
 * @access Private
 */
exports.saveFCMToken = async (req, res) => {
  try {
    console.log('=== SAVE FCM TOKEN REQUEST ===');
    console.log('User ID:', req.user?.id);
    console.log('User Type:', req.userType);
    console.log('Request Body:', req.body);
    
    const { fcmToken, deviceId, platform } = req.body;
    const userId = req.user.id;
    const userType = req.userType; // 'male' or 'female'

    // Validate input
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Validate user type
    if (!['male', 'female', 'agency'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Validate platform if provided
    if (platform && !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be ios, android, or web'
      });
    }

    // Save FCM token with device info
    const deviceInfo = {
      deviceId: deviceId || null,
      platform: platform || null
    };

    console.log('Calling saveFCMToken with:', { userId, userType, fcmToken, deviceInfo });
    
    const success = await saveFCMToken(userId, userType, fcmToken, deviceInfo);
    
    console.log('saveFCMToken result:', success);

    if (success) {
      return res.json({
        success: true,
        message: 'FCM token saved successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to save FCM token'
      });
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Remove FCM token (device logout/uninstall)
 * @route DELETE /notification/token
 * @access Private
 */
exports.removeFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;
    const userType = req.userType;

    // Validate input
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const success = await removeFCMToken(userId, userType, fcmToken);

    if (success) {
      return res.json({
        success: true,
        message: 'FCM token removed successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to remove FCM token'
      });
    }
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get user's registered devices
 * @route GET /notification/devices
 * @access Private
 */
exports.getRegisteredDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;

    let User;
    if (userType === 'male') {
      User = require('../../models/maleUser/MaleUser');
    } else if (userType === 'female') {
      User = require('../../models/femaleUser/FemaleUser');
    } else if (userType === 'agency') {
      User = require('../../models/agency/AgencyUser');
    }

    const user = await User.findById(userId).select('fcmTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const devices = user.fcmTokens || [];
    
    return res.json({
      success: true,
      data: {
        deviceCount: devices.length,
        devices: devices.map(tokenObj => ({
          deviceId: tokenObj.deviceId,
          platform: tokenObj.platform,
          registeredAt: tokenObj.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting registered devices:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};