// Notification Service - Modular Implementation with Clean Architecture
const notificationService = require('./notification');

// Export all functions from modular notification service
module.exports = {
  // Primary event-based notification interface (recommended)
  handleEvent: notificationService.handleEvent,
  
  // Direct delivery for immediate notifications
  deliverNotification: notificationService.deliverNotification,
  
  // Raw event handler (internal use)
  handleEventRaw: notificationService.handleEventRaw,
  
  // Chat notifications
  sendChatNotification: notificationService.sendChatNotification,
  sendRoomNotification: notificationService.sendRoomNotification,
  
  // Direct notifications with delivery intent
  sendNotificationWithIntent: notificationService.sendNotificationWithIntent,
  
  // Notification management
  getUserNotifications: notificationService.getUserNotifications,
  getAdminNotifications: notificationService.getAdminNotifications,
  markNotificationAsRead: notificationService.markNotificationAsRead,
  markAllNotificationsAsRead: notificationService.markAllNotificationsAsRead,
  getUnreadCount: notificationService.getUnreadCount,
  
  // Utility functions
  // DEPRECATED: getAdminId is no longer used for notification delivery
  // Retained only for audit logs and attribution purposes
  getAdminId: notificationService.getAdminId
};