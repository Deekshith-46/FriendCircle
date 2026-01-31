const { sendPushNotification } = require('./pushSender');
const { getSocketIdForUser, getIO } = require('../../socketInstance');

// Send socket notification to specific user
const sendSocketNotification = async (userId, userType, event, data) => {
  try {
    const socketId = getSocketIdForUser(userId, userType);

    if (socketId) {
      // Emit via global socket.io instance
      const { getIO } = require('../../socketInstance');
      const io = getIO();
      if (io) {
        io.to(socketId).emit(event, data);
        console.log(`Socket notification sent to user ${userId} (${userType}):`, event);
        return { delivered: true, via: 'socket', socketId: socketId };
      }
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
    // Always save to database for persistent notifications
    const notificationSaved = await require('./notificationStorage').saveNotification(
      userId, userType, title, body, 'system', data, 'medium'
    );

    // Check if user should receive push (even if online)
    const shouldSendPush = !userActiveInRoom; // User not actively viewing the relevant content
    
    let deliveryResult = {
      db: notificationSaved,
      socket: null,
      push: null
    };

    // Send socket notification if user is connected
    const socketResult = await sendSocketNotification(userId, userType, 'notification:received', {
      title,
      body,
      data,
      timestamp: new Date().toISOString()
    });
    deliveryResult.socket = socketResult;

    // Send push notification if needed
    if (shouldSendPush) {
      // For now, we'll skip push notifications since UserToken model doesn't exist
      // This would need to be implemented with a proper token storage mechanism
      console.log('Push notification would be sent here if UserToken model existed');
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