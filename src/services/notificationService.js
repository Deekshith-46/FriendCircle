// src/services/notificationService.js
const { getMessaging } = require('../config/firebase');
const MaleUser = require('../models/maleUser/MaleUser');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const AgencyUser = require('../models/agency/AgencyUser');
const { getIO, getSocketIdForUser } = require('../socketInstance');

/**
 * Send push notification to a user (supports multiple devices)
 * @param {string} userId - Target user ID
 * @param {string} userType - 'male' or 'female'
 * @param {Object} payload - Notification payload
 * @returns {Promise<Array>} Array of success statuses for each device
 */
const sendPushNotification = async (userId, userType, payload) => {
  try {
    // Get user to retrieve FCM tokens
    let user;
    if (userType === 'male') {
      user = await MaleUser.findById(userId).select('fcmTokens name firstName lastName');
    } else if (userType === 'female') {
      user = await FemaleUser.findById(userId).select('fcmTokens name');
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId).select('fcmTokens firstName lastName');
    }

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`No FCM tokens found for ${userType} user ${userId}`);
      return [];
    }

    const messaging = getMessaging();
    if (!messaging) {
      console.error('Firebase messaging not initialized');
      return [];
    }

    // Send to all devices
    const notificationPromises = user.fcmTokens.map(async (tokenObj, index) => {
      try {
        const message = {
          notification: {
            title: payload.title || 'New Notification',
            body: payload.body || 'You have a new notification'
          },
          data: payload.data || {},
          token: tokenObj.token,
        };

        // Add platform-specific configurations
        if (payload.android && tokenObj.platform === 'android') {
          message.android = payload.android;
        }
        
        if (payload.apns && tokenObj.platform === 'ios') {
          message.apns = payload.apns;
        }

        await messaging.send(message);
        console.log(`✅ Push notification sent to device ${index + 1}/${user.fcmTokens.length} for ${userType} user ${userId}`);
        return { success: true, deviceId: tokenObj.deviceId, platform: tokenObj.platform };
      } catch (error) {
        console.error(`❌ Failed to send notification to device ${index + 1}:`, error.message);
        return { success: false, deviceId: tokenObj.deviceId, platform: tokenObj.platform, error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successful = results.filter(r => r.success).length;
    console.log(`📊 Notification results: ${successful}/${results.length} devices successful`);
    
    return results;
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
    return [];
  }
};

/**
 * Send chat message notification with online/offline detection
 * @param {string} senderId - Sender user ID
 * @param {string} senderType - Sender user type ('male' or 'female')
 * @param {string} receiverId - Receiver user ID
 * @param {string} receiverType - Receiver user type ('male' or 'female')
 * @param {Object} messageData - Message data
 * @returns {Promise<boolean>} Success status
 */
const sendChatMessageNotification = async (senderId, senderType, receiverId, receiverType, messageData) => {
  try {
    // Get sender name - handle both male and female user schemas
    let sender;
    let senderName = 'Someone';
    
    if (senderType === 'male') {
      sender = await MaleUser.findById(senderId).select('firstName lastName');
      if (sender) {
        senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Male User';
      }
    } else if (senderType === 'female') {
      sender = await FemaleUser.findById(senderId).select('name');
      if (sender) {
        senderName = sender.name || 'Female User';
      }
    } else if (senderType === 'agency') {
      sender = await AgencyUser.findById(senderId).select('firstName lastName');
      if (sender) {
        senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Agency User';
      }
    }

    // Prepare notification payload
    const payload = {
      title: `New message from ${senderName}`,
      body: getMessagePreview(messageData),
      data: {
        type: 'chat_message',
        senderId: senderId.toString(),
        senderType: senderType,
        receiverId: receiverId.toString(),
        receiverType: receiverType,
        roomId: messageData.chatRoomId?.toString() || '',
        messageId: messageData._id?.toString() || '',
        timestamp: new Date().toISOString(),
      }
    };

    // Check if receiver is online via socket
    const socketId = getSocketIdForUser(receiverId, receiverType);
    
    if (socketId) {
      const io = getIO();
      if (io) {
        // Check if the receiver is in the specific chat room
        // Get the room instance to check if the receiver is in that specific room
        const isReceiverInRoom = io.sockets.adapter.rooms.get(messageData.chatRoomId?.toString())?.has(socketId);
        
        if (isReceiverInRoom) {
          // User is online AND in the chat room - send via socket only
          io.to(messageData.chatRoomId.toString()).emit('newMessageNotification', {
            ...payload,
            messageData
          });
          console.log(`💬 Message sent via socket to ${receiverType} user ${receiverId} (in chat room)`);
          return true;
        } else {
          // User is online but NOT in the chat room - send both socket and push notification
          // This ensures they get notified about the new message even though they're not currently viewing it
          io.to(socketId).emit('newMessageNotification', {
            ...payload,
            messageData
          });
          console.log(`💬 Message sent via socket to ${receiverType} user ${receiverId} (online but not in room)`);
          
          // Also send push notification since they're not actively viewing the chat
          const success = await sendPushNotification(receiverId, receiverType, payload);
          return success.length > 0;
        }
      }
    }

    // User is offline - send push notification
    const success = await sendPushNotification(receiverId, receiverType, payload);
    
    if (success.length > 0) {
      console.log(`📱 Push notification sent to ${receiverType} user ${receiverId} (offline)`);
    } else {
      console.log(`❌ No devices available to notify ${receiverType} user ${receiverId}`);
    }

    return success.length > 0;
  } catch (error) {
    console.error('❌ Error sending chat message notification:', error.message);
    return false;
  }
};

/**
 * Get message preview text
 * @param {Object} messageData - Message data
 * @returns {string} Preview text
 */
const getMessagePreview = (messageData) => {
  if (messageData.type === 'text') {
    return messageData.content?.substring(0, 50) || 'New message';
  } else if (messageData.type === 'image') {
    return '📷 Photo';
  } else if (messageData.type === 'video') {
    return '📹 Video';
  } else if (messageData.type === 'audio') {
    return '🎵 Audio message';
  } else if (messageData.type === 'emoji') {
    return messageData.content || '😊';
  }
  return 'New message';
};

/**
 * Save FCM token for a user (supports multiple devices)
 * @param {string} userId - User ID
 * @param {string} userType - User type ('male' or 'female')
 * @param {string} fcmToken - FCM token
 * @param {Object} deviceInfo - Optional device information
 * @returns {Promise<boolean>} Success status
 */
const saveFCMToken = async (userId, userType, fcmToken, deviceInfo = {}) => {
  try {
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
 * @param {string} userType - User type ('male' or 'female')
 * @param {string} fcmToken - FCM token to remove
 * @returns {Promise<boolean>} Success status
 */
const removeFCMToken = async (userId, userType, fcmToken) => {
  try {
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
  sendPushNotification,
  sendChatMessageNotification,
  saveFCMToken,
  removeFCMToken,
  getMessagePreview,
  getSocketIdForUser // Export for use in controllers if needed
};