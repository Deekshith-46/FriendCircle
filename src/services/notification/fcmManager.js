let MaleUser, FemaleUser, AgencyUser;

// Dynamically import models to avoid circular dependency issues
const loadModels = () => {
  if (!MaleUser) MaleUser = require('../models/maleUser/MaleUser');
  if (!FemaleUser) FemaleUser = require('../models/femaleUser/FemaleUser');
  if (!AgencyUser) AgencyUser = require('../models/agency/AgencyUser');
};

/**
 * Save FCM token for a user (device registration)
 * @param {string} userId - User ID
 * @param {string} userType - User type ('male', 'female', or 'agency')
 * @param {string} fcmToken - FCM token
 * @param {Object} deviceInfo - Optional device information
 * @returns {Promise<boolean>} Success status
 */
const saveFCMToken = async (userId, userType, fcmToken, deviceInfo = {}) => {
  try {
    // Load models dynamically
    loadModels();
    
    let User;
    if (userType === 'male') {
      User = MaleUser;
    } else if (userType === 'female') {
      User = FemaleUser;
    } else if (userType === 'agency') {
      User = AgencyUser;
    } else {
      throw new Error('Invalid user type');
    }

    // Check if token already exists for this user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User ${userId} not found`);
      return false;
    }

    const existingTokenIndex = user.fcmTokens?.findIndex(tokenObj => tokenObj.token === fcmToken);
    
    if (existingTokenIndex !== -1 && existingTokenIndex !== undefined) {
      // Update existing token
      user.fcmTokens[existingTokenIndex] = {
        token: fcmToken,
        deviceId: deviceInfo.deviceId || user.fcmTokens[existingTokenIndex].deviceId,
        platform: deviceInfo.platform || user.fcmTokens[existingTokenIndex].platform,
        createdAt: new Date()
      };
      console.log(`🔄 Updated existing FCM token for ${userType} user ${userId}`);
    } else {
      // Add new token
      if (!user.fcmTokens) user.fcmTokens = [];
      
      user.fcmTokens.push({
        token: fcmToken,
        deviceId: deviceInfo.deviceId,
        platform: deviceInfo.platform,
        createdAt: new Date()
      });
      
      // Limit to 5 devices max to prevent abuse
      if (user.fcmTokens.length > 5) {
        user.fcmTokens = user.fcmTokens.slice(-5);
        console.log(`✂️ Trimmed FCM tokens to last 5 for ${userType} user ${userId}`);
      }
      
      console.log(`➕ Added new FCM token for ${userType} user ${userId}`);
    }

    await user.save();
    console.log(`✅ FCM tokens updated for ${userType} user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving FCM token:', error.message);
    return false;
  }
};

/**
 * Remove FCM token for a user (device logout/uninstall)
 * @param {string} userId - User ID
 * @param {string} userType - User type ('male', 'female', or 'agency')
 * @param {string} fcmToken - FCM token to remove
 * @returns {Promise<boolean>} Success status
 */
const removeFCMToken = async (userId, userType, fcmToken) => {
  try {
    // Load models dynamically
    loadModels();
    
    let User;
    if (userType === 'male') {
      User = MaleUser;
    } else if (userType === 'female') {
      User = FemaleUser;
    } else if (userType === 'agency') {
      User = AgencyUser;
    } else {
      throw new Error('Invalid user type');
    }

    const updateResult = await User.updateOne(
      { _id: userId },
      { $pull: { fcmTokens: { token: fcmToken } } }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(`✅ Removed FCM token for ${userType} user ${userId}`);
      return true;
    } else {
      console.log(`ℹ️ No FCM token found to remove for ${userType} user ${userId}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error removing FCM token:', error.message);
    return false;
  }
};

module.exports = {
  saveFCMToken,
  removeFCMToken
};