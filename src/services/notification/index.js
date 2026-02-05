const { handleEvent, getAdminId } = require('./eventHandler');
const { sendChatNotification, sendRoomNotification } = require('./chatNotifier');
const { sendNotificationWithIntent } = require('./socketSender');
const { 
  saveNotification,
  getUserNotifications, 
  getAdminNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getUnreadCount 
} = require('./notificationStorage');

// Main notification service API
const notificationService = {
  // Event-based notifications with proper delivery flow
  handleEvent: async (eventType, payload) => {
    console.log('=== NOTIFICATION SERVICE handleEvent ===');
    console.log('eventType:', eventType);
    console.log('payload:', payload);
    
    // Step 1: Handle event and build notification data
    const notificationData = await handleEvent(eventType, payload);
    console.log('notificationData:', notificationData);
    
    if (!notificationData) {
      console.log('No notification data generated');
      return false;
    }
    
    // Step 2: Save to database (skip for admin-wide notifications)
    let notificationId = null;
    let dbSaveSuccess = true;
    
    if (!(notificationData.receiverType === 'admin' && notificationData.receiverId === null)) {
      notificationId = await saveNotification(
        notificationData.receiverId,
        notificationData.receiverType,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.data,
        notificationData.priority
      );
      
      if (!notificationId) {
        dbSaveSuccess = false;
        console.warn('Warning: Failed to save notification to database, but continuing with socket delivery');
      }
    }
    
    // Step 3: Deliver via appropriate channels
    // For admin notifications with receiverId: null, broadcast to admin socket room
    if (notificationData.receiverType === 'admin' && notificationData.receiverId === null) {
      // Broadcast to all admins via socket room
      try {
        const { getIO } = require('./socketSender');
        const io = getIO();
        if (io) {
          // Emit to admin room (admins_room)
          io.to('admins_room').emit('notification', {
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            priority: notificationData.priority,
            data: notificationData.data,
            timestamp: new Date().toISOString()
          });
          console.log(`Admin notification broadcast to admins_room: ${notificationData.title}`);
        }
      } catch (socketError) {
        console.warn('Failed to broadcast admin notification via socket:', socketError.message);
        // Continue with DB-only delivery as fallback
      }
      return true;
    }
    
    // For user-specific notifications, deliver via socket/push
    const deliveryResult = await sendNotificationWithIntent(
      notificationData.receiverId,
      notificationData.receiverType,
      notificationData.title,
      notificationData.message,
      notificationData.data,
      false // userActiveInRoom = false for event notifications
    );
    
    // Return success if either DB save succeeded OR socket delivery succeeded
    return dbSaveSuccess || (deliveryResult.socket && deliveryResult.socket.delivered);
  },
  
  // Direct delivery method for immediate notifications
  deliverNotification: async (notificationData) => {
    if (!notificationData) return false;
    
    const notificationId = await saveNotification(
      notificationData.receiverId,
      notificationData.receiverType,
      notificationData.title,
      notificationData.message,
      notificationData.type,
      notificationData.data,
      notificationData.priority
    );
    
    if (!notificationId) return false;
    
    const deliveryResult = await sendNotificationWithIntent(
      notificationData.receiverId,
      notificationData.receiverType,
      notificationData.title,
      notificationData.message,
      notificationData.data,
      false
    );
    
    return deliveryResult.db !== false;
  },
  // Event-based notifications (raw handler - for internal use)
  handleEventRaw: handleEvent,
  
  // Chat notifications
  sendChatNotification,
  sendRoomNotification,
  
  // Direct notifications with delivery intent
  sendNotificationWithIntent,
  
  // Notification management
  getUserNotifications,
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  
  // Utility functions
  // DEPRECATED: getAdminId is no longer used for notification delivery
  // Retained only for audit logs and attribution purposes
  getAdminId: (...args) => {
    console.warn('DEPRECATED: getAdminId is deprecated for notification delivery. Use receiverType: "admin" with receiverId: null instead.');
    return getAdminId(...args);
  }
};

module.exports = notificationService;