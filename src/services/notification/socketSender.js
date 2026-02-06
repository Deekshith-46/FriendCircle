const { sendPushNotification, sendMultiplePushNotifications } = require('./pushSender');
const { getSocketIdForUser, getIO } = require('../../socketInstance');

// Send socket notification to specific user
const sendSocketNotification = async (userId, userType, event, data) => {
  try {
    // Emit to user's notification room instead of socketId
    const room = `${userType}_${userId}`;
    
    // Emit via global socket.io instance
    const { getIO } = require('../../socketInstance');
    const io = getIO();
    if (io) {
      io.to(room).emit(event, data);
      console.log(`Socket notification sent to room ${room}:`, event);
      return { delivered: true, via: 'socket', room: room };
    }

    return { delivered: false, via: 'none' };
  } catch (error) {
    console.error('Error sending socket notification:', error);
    return { delivered: false, via: 'error', error: error.message };
  }
};

// Send notification with delivery intent logic (Issue 3 fix)
const sendNotificationWithIntent = async (userId, userType, title, body, data = {}, userActiveInRoom = false) => {
  try {
    // Check if user should receive push (even if online)
    const shouldSendPush = !userActiveInRoom; // User not actively viewing the relevant content
    
    let deliveryResult = {
      db: true, // Assume DB save happened in the event handler
      socket: null,
      push: null
    };

    // Send socket notification if user is connected
    const socketResult = await sendSocketNotification(userId, userType, 'notification', {
      title,
      message: body,
      data,
      timestamp: new Date().toISOString()
    });
    deliveryResult.socket = socketResult;

    // Send push notification if needed
    if (shouldSendPush) {
      // Get user to access FCM tokens
      let User;
      if (userType === 'male') {
        User = require('../../models/maleUser/MaleUser');
      } else if (userType === 'female') {
        User = require('../../models/femaleUser/FemaleUser');
      } else if (userType === 'agency') {
        User = require('../../models/agency/AgencyUser');
      } else {
        console.log(`Invalid user type: ${userType}`);
        return deliveryResult;
      }
      
      const user = await User.findById(userId).select('fcmTokens');
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        // Extract tokens for batch processing
        const tokens = user.fcmTokens.map(tokenObj => tokenObj.token);
        
        // Send multiple push notifications at once for efficiency
        const pushResult = await sendMultiplePushNotifications(tokens, title, body, {
          ...data,
          userId: userId.toString(),
          userType: userType
        });
        
        // Map results back to include platform info
        const pushResults = user.fcmTokens.map((tokenObj, index) => ({
          token: tokenObj.token,
          platform: tokenObj.platform,
          success: pushResult.results[index]?.success || false
        }));
        
        deliveryResult.push = pushResults;
        console.log(`Push notifications sent to ${user.fcmTokens.length} device(s) for user ${userId}. Success: ${pushResult.successCount}, Failed: ${pushResult.failureCount}`);
      } else {
        console.log(`No FCM tokens found for user ${userId}, skipping push notification`);
      }
    }

    console.log(`Notification delivery result for ${userId}:`, deliveryResult);
    return deliveryResult;
  } catch (error) {
    console.error('Error in sendNotificationWithIntent:', error);
    return { db: false, socket: null, push: null, error: error.message };
  }
};

module.exports = {
  sendSocketNotification,
  sendNotificationWithIntent,
  getIO
};