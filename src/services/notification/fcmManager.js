// Lazy import models with error handling to avoid circular dependencies
const getModel = (modelPath) => {
  try {
    return require(modelPath);
  } catch (error) {
    console.error(`❌ Failed to import model ${modelPath}:`, error.message);
    throw error;
  }
};

const getUserModel = (userType) => {
  switch (userType) {
    case 'male':
      return getModel('../../models/maleUser/MaleUser');
    case 'female':
      return getModel('../../models/femaleUser/FemaleUser');
    case 'agency':
      return getModel('../../models/agency/AgencyUser');
    default:
      throw new Error(`Invalid user type: ${userType}`);
  }
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
    console.log('=== FCM MANAGER saveFCMToken ===');
    console.log('userId:', userId);
    console.log('userType:', userType);
    console.log('fcmToken:', fcmToken);
    console.log('deviceInfo:', deviceInfo);
    
    // Lazy load model only when needed
    const User = getUserModel(userType);
    console.log('User model loaded successfully');

    // Check if token already exists for this user
    const user = await User.findById(userId);
    console.log('User found:', !!user);
    if (!user) {
      console.error(`❌ User ${userId} not found`);
      return false;
    }

    console.log('Current fcmTokens:', user.fcmTokens);
    const existingTokenIndex = user.fcmTokens?.findIndex(tokenObj => tokenObj.token === fcmToken);
    console.log('existingTokenIndex:', existingTokenIndex);
    
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

    console.log('Saving user with updated fcmTokens...');
    await user.save();
    console.log(`✅ FCM tokens updated for ${userType} user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    console.error('Error stack:', error.stack);
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
    // Lazy load model only when needed
    const User = getUserModel(userType);

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