const Notification = require('../../models/common/Notification');

// Rate limiting cache to prevent notification spam
const notificationRateLimitCache = new Map(); // key: userId:userType:type, value: { count, timestamp }

// Check if notification should be rate limited
const isRateLimited = (userId, userType, type) => {
  const key = `${userId}:${userType}:${type}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxPerWindow = 5; // Max 5 notifications per minute per user-type-type combination

  const record = notificationRateLimitCache.get(key);
  
  if (!record) {
    // First notification in this window
    notificationRateLimitCache.set(key, { count: 1, timestamp: now });
    return false;
  }

  // Check if window has expired
  if (now - record.timestamp > windowMs) {
    // Reset counter for new window
    notificationRateLimitCache.set(key, { count: 1, timestamp: now });
    return false;
  }

  // Check if limit exceeded
  if (record.count >= maxPerWindow) {
    return true; // Rate limited
  }

  // Increment counter
  record.count += 1;
  return false; // Not rate limited
};

// Clear expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  for (const [key, record] of notificationRateLimitCache.entries()) {
    if (now - record.timestamp > windowMs) {
      notificationRateLimitCache.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds

// Save notification to database
const saveNotification = async (receiverId, receiverType, title, message, type, data = {}, priority = 'medium') => {
  try {
    console.log('=== NOTIFICATION STORAGE ===');
    console.log('receiverId:', receiverId);
    console.log('receiverType:', receiverType);
    console.log('title:', title);
    console.log('message:', message);
    console.log('type:', type);
    console.log('data:', data);
    
    // Apply rate limiting for user-specific notifications
    if (receiverId && ['KYC_APPROVED', 'WITHDRAWAL_APPROVED', 'ACCOUNT_APPROVED'].includes(type)) {
      if (isRateLimited(receiverId, receiverType, type)) {
        console.log(`⚠️ Notification rate limited for ${receiverType} user ${receiverId}, type: ${type}`);
        return null; // Skip saving rate-limited notification
      }
    }
    
    // Convert receiverType to receiverModel for database schema
    const receiverModelMap = {
      'admin': 'Admin',
      'male': 'MaleUser',
      'female': 'FemaleUser',
      'agency': 'AgencyUser'
    };
    
    if (!receiverModelMap[receiverType]) {
      throw new Error(`Invalid receiverType: ${receiverType}`);
    }
    
    const receiverModel = receiverModelMap[receiverType];
    
    const notification = new Notification({
      receiverId,
      receiverModel,
      receiverType,
      title,
      message,
      type,
      data,
      priority
    });

    await notification.save();
    console.log('✅ Notification saved to database:', notification._id);
    return notification._id;
  } catch (error) {
    console.error('❌ Error saving notification:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
};

// Get notifications for user with pagination
const getUserNotifications = async (userId, userType, page = 1, limit = 10, filters = {}) => {
  try {
    const skip = (page - 1) * limit;
    
    let query = {
      receiverId: userId,
      receiverType: userType
    };

    // Apply filters
    if (filters.read !== undefined) {
      query.read = filters.read;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Get admin notifications - handles both individual admin and group admin notifications
const getAdminNotifications = async (page = 1, limit = 10, filters = {}) => {
  try {
    const skip = (page - 1) * limit;
    
    // Query for admin notifications - targets all admin users
    let query = {
      receiverModel: 'Admin'
    };

    // Apply filters
    if (filters.read !== undefined) {
      query.read = filters.read;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    throw error;
  }
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, userId, userType) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        receiverId: userId,
        receiverType: userType
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read for user
const markAllNotificationsAsRead = async (userId, userType) => {
  try {
    const result = await Notification.updateMany(
      {
        receiverId: userId,
        receiverType: userType,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Get unread count
const getUnreadCount = async (userId, userType) => {
  try {
    const count = await Notification.countDocuments({
      receiverId: userId,
      receiverType: userType,
      read: false
    });

    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

module.exports = {
  saveNotification,
  getUserNotifications,
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
};