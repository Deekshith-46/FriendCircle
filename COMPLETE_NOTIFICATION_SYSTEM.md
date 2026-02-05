# 📱 COMPLETE NOTIFICATION SYSTEM DOCUMENTATION

## 📋 Overview
This document contains all code related to the complete notification system for admin, male, female, and agency users in the Friend Circle application.

## 📁 File Structure
```
src/
├── controllers/
│   ├── adminControllers/
│   │   └── adminController.js
│   ├── common/
│   │   ├── notificationController.js
│   │   └── notificationService.js
│   ├── femaleUserControllers/
│   │   └── ... (notification related)
│   └── maleUserControllers/
│       └── ... (notification related)
├── models/
│   └── common/
│       └── Notification.js
├── routes/
│   ├── adminRoutes/
│   │   └── notificationRoutes.js
│   └── common/
│       └── notificationRoutes.js
├── services/
│   └── notification/
│       ├── eventHandler.js
│       ├── notificationService.js
│       └── ... (other notification services)
└── public/
    ├── fcm-notification-test.html
    └── notification-test-panel.html
```

## 📱 NOTIFICATION MODELS

### Notification.js
```javascript
// src/models/common/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userType',
    required: true
  },
  userType: {
    type: String,
    required: true,
    enum: ['male', 'female', 'agency', 'admin']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'REGISTRATION_APPROVED',
      'REGISTRATION_REJECTED',
      'KYC_APPROVED',
      'KYC_REJECTED',
      'WITHDRAWAL_APPROVED',
      'WITHDRAWAL_REJECTED',
      'CHAT_MESSAGE',
      'FOLLOW_REQUEST',
      'GIFT_RECEIVED',
      'LEVEL_UP',
      'REFERRAL_BONUS'
    ]
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, userType: 1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
```

## 🎯 NOTIFICATION EVENTS

### notificationEvents.js
```javascript
// src/constants/notificationEvents.js
const NOTIFICATION_EVENTS = {
  // Admin Action Events
  REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  WITHDRAWAL_APPROVED: 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED: 'WITHDRAWAL_REJECTED',
  
  // User Interaction Events
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  FOLLOW_REQUEST: 'FOLLOW_REQUEST',
  FOLLOW_ACCEPTED: 'FOLLOW_ACCEPTED',
  GIFT_RECEIVED: 'GIFT_RECEIVED',
  
  // System Events
  LEVEL_UP: 'LEVEL_UP',
  REFERRAL_BONUS: 'REFERRAL_BONUS',
  DAILY_REWARD: 'DAILY_REWARD'
};

module.exports = NOTIFICATION_EVENTS;
```

## 🛠️ NOTIFICATION SERVICES

### notificationService.js (Core Service)
```javascript
// src/services/notificationService.js
const Notification = require('../models/common/Notification');
const { getSocketInstance } = require('../socketInstance');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../config/firebaseServiceAccount.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }
}

/**
 * Create and save notification to database
 */
const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send FCM notification
 */
const sendFCMNotification = async (fcmToken, payload) => {
  if (!fcmToken) {
    console.log('No FCM token provided');
    return;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.message
      },
      data: {
        type: payload.type,
        notificationId: payload.notificationId?.toString() || '',
        relatedId: payload.relatedId?.toString() || '',
        timestamp: new Date().toISOString()
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    // Don't throw error as this shouldn't break the main flow
  }
};

/**
 * Send real-time notification via Socket.IO
 */
const sendSocketNotification = (userId, userType, notification) => {
  try {
    const io = getSocketInstance();
    if (!io) {
      console.log('Socket.IO instance not available');
      return;
    }

    const roomName = `${userType}_${userId}`;
    io.to(roomName).emit('notification:received', notification);
    console.log(`Socket notification sent to room: ${roomName}`);
  } catch (error) {
    console.error('Error sending socket notification:', error);
  }
};

/**
 * Main function to send notification (database + FCM + Socket)
 */
const sendNotification = async (notificationData, fcmToken = null) => {
  try {
    // 1. Save to database
    const notification = await createNotification(notificationData);
    
    // 2. Send FCM notification if token provided
    if (fcmToken) {
      await sendFCMNotification(fcmToken, {
        ...notificationData,
        notificationId: notification._id
      });
    }
    
    // 3. Send real-time socket notification
    sendSocketNotification(
      notificationData.userId,
      notificationData.userType,
      notification
    );
    
    return notification;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    throw error;
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, userType, limit = 50, skip = 0) => {
  try {
    const notifications = await Notification.find({
      userId: userId,
      userType: userType
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
    
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (notificationId, userId, userType) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: userId,
        userType: userType
      },
      { isRead: true },
      { new: true }
    );
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (userId, userType) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: userId,
        userType: userType,
        isRead: false
      },
      { isRead: true }
    );
    
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Get notification count
 */
const getNotificationCount = async (userId, userType, unreadOnly = false) => {
  try {
    const query = {
      userId: userId,
      userType: userType
    };
    
    if (unreadOnly) {
      query.isRead = false;
    }
    
    const count = await Notification.countDocuments(query);
    return count;
  } catch (error) {
    console.error('Error getting notification count:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationCount,
  sendFCMNotification,
  sendSocketNotification
};
```

## ⚡ EVENT HANDLER

### eventHandler.js
```javascript
// src/services/notification/eventHandler.js
const { sendNotification } = require('../notificationService');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const AgencyUser = require('../../models/agency/AgencyUser');

/**
 * Handle registration approved notification
 */
const handleRegistrationApproved = async (data) => {
  try {
    const { userId, userType, userName } = data;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(userId);
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId);
    }
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const notificationData = {
      userId: userId,
      userType: userType,
      title: 'Registration Approved! 🎉',
      message: `Welcome ${userName || 'User'}! Your registration has been approved. You can now start using all features.`,
      type: 'REGISTRATION_APPROVED',
      metadata: {
        approvalDate: new Date().toISOString()
      }
    };

    await sendNotification(notificationData, user.fcmToken);
    console.log(`Registration approved notification sent to ${userType} user: ${userId}`);
  } catch (error) {
    console.error('Error handling registration approved:', error);
  }
};

/**
 * Handle registration rejected notification
 */
const handleRegistrationRejected = async (data) => {
  try {
    const { userId, userType, userName, rejectionReason } = data;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(userId);
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId);
    }
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const notificationData = {
      userId: userId,
      userType: userType,
      title: 'Registration Update',
      message: `Sorry ${userName || 'User'}, your registration has been rejected${rejectionReason ? `: ${rejectionReason}` : '.'} Please contact support for more information.`,
      type: 'REGISTRATION_REJECTED',
      metadata: {
        rejectionDate: new Date().toISOString(),
        reason: rejectionReason
      }
    };

    await sendNotification(notificationData, user.fcmToken);
    console.log(`Registration rejected notification sent to ${userType} user: ${userId}`);
  } catch (error) {
    console.error('Error handling registration rejected:', error);
  }
};

/**
 * Handle KYC approved notification
 */
const handleKycApproved = async (data) => {
  try {
    const { userId, userType, userName } = data;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(userId);
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId);
    } else if (userType === 'male') {
      user = await MaleUser.findById(userId);
    }
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const notificationData = {
      userId: userId,
      userType: userType,
      title: 'KYC Approved! ✅',
      message: `Great news ${userName || 'User'}! Your KYC verification has been approved. You can now access all premium features.`,
      type: 'KYC_APPROVED',
      metadata: {
        approvalDate: new Date().toISOString()
      }
    };

    await sendNotification(notificationData, user.fcmToken);
    console.log(`KYC approved notification sent to ${userType} user: ${userId}`);
  } catch (error) {
    console.error('Error handling KYC approved:', error);
  }
};

/**
 * Handle KYC rejected notification
 */
const handleKycRejected = async (data) => {
  try {
    const { userId, userType, userName, rejectionReason } = data;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(userId);
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId);
    } else if (userType === 'male') {
      user = await MaleUser.findById(userId);
    }
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const notificationData = {
      userId: userId,
      userType: userType,
      title: 'KYC Verification Update',
      message: `Your KYC verification has been rejected${rejectionReason ? `: ${rejectionReason}` : '.'} Please upload clear documents and try again.`,
      type: 'KYC_REJECTED',
      metadata: {
        rejectionDate: new Date().toISOString(),
        reason: rejectionReason
      }
    };

    await sendNotification(notificationData, user.fcmToken);
    console.log(`KYC rejected notification sent to ${userType} user: ${userId}`);
  } catch (error) {
    console.error('Error handling KYC rejected:', error);
  }
};

/**
 * Handle withdrawal approved notification
 */
const handleWithdrawalApproved = async (data) => {
  try {
    const { userId, userType, userName, amount, currency = 'USD' } = data;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(userId);
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId);
    } else if (userType === 'male') {
      user = await MaleUser.findById(userId);
    }
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const notificationData = {
      userId: userId,
      userType: userType,
      title: 'Withdrawal Approved! 💰',
      message: `Your withdrawal request of ${currency} ${amount} has been approved and processed successfully.`,
      type: 'WITHDRAWAL_APPROVED',
      metadata: {
        amount: amount,
        currency: currency,
        approvalDate: new Date().toISOString()
      }
    };

    await sendNotification(notificationData, user.fcmToken);
    console.log(`Withdrawal approved notification sent to ${userType} user: ${userId}`);
  } catch (error) {
    console.error('Error handling withdrawal approved:', error);
  }
};

/**
 * Handle withdrawal rejected notification
 */
const handleWithdrawalRejected = async (data) => {
  try {
    const { userId, userType, userName, amount, currency = 'USD', rejectionReason } = data;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(userId);
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId);
    } else if (userType === 'male') {
      user = await MaleUser.findById(userId);
    }
    
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const notificationData = {
      userId: userId,
      userType: userType,
      title: 'Withdrawal Update',
      message: `Your withdrawal request of ${currency} ${amount} has been rejected${rejectionReason ? `: ${rejectionReason}` : '.'}`,
      type: 'WITHDRAWAL_REJECTED',
      metadata: {
        amount: amount,
        currency: currency,
        rejectionDate: new Date().toISOString(),
        reason: rejectionReason
      }
    };

    await sendNotification(notificationData, user.fcmToken);
    console.log(`Withdrawal rejected notification sent to ${userType} user: ${userId}`);
  } catch (error) {
    console.error('Error handling withdrawal rejected:', error);
  }
};

/**
 * Main event handler router
 */
const handleEvent = async (eventType, data) => {
  try {
    console.log(`Handling event: ${eventType}`, data);
    
    switch (eventType) {
      case 'REGISTRATION_APPROVED':
        await handleRegistrationApproved(data);
        break;
      case 'REGISTRATION_REJECTED':
        await handleRegistrationRejected(data);
        break;
      case 'KYC_APPROVED':
        await handleKycApproved(data);
        break;
      case 'KYC_REJECTED':
        await handleKycRejected(data);
        break;
      case 'WITHDRAWAL_APPROVED':
        await handleWithdrawalApproved(data);
        break;
      case 'WITHDRAWAL_REJECTED':
        await handleWithdrawalRejected(data);
        break;
      default:
        console.log(`Unknown event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error handling event ${eventType}:`, error);
  }
};

module.exports = {
  handleEvent
};
```

## 🎯 ADMIN CONTROLLERS

### adminController.js (Notification Related)
```javascript
// src/controllers/adminControllers/adminController.js
const { handleEvent } = require('../../services/notification/eventHandler');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const AgencyUser = require('../../models/agency/AgencyUser');
const MaleUser = require('../../models/maleUser/MaleUser');

/**
 * Approve user registration
 */
exports.approveRegistration = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findByIdAndUpdate(
        userId,
        { reviewStatus: 'accepted' },
        { new: true }
      );
    } else if (userType === 'agency') {
      user = await AgencyUser.findByIdAndUpdate(
        userId,
        { reviewStatus: 'accepted' },
        { new: true }
      );
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Trigger notification event
    await handleEvent('REGISTRATION_APPROVED', {
      userId: user._id,
      userType: userType,
      userName: user.name || user.firstName
    });

    res.json({
      success: true,
      message: 'User registration approved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reject user registration
 */
exports.rejectRegistration = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const { rejectionReason } = req.body;
    
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findByIdAndUpdate(
        userId,
        { reviewStatus: 'rejected' },
        { new: true }
      );
    } else if (userType === 'agency') {
      user = await AgencyUser.findByIdAndUpdate(
        userId,
        { reviewStatus: 'rejected' },
        { new: true }
      );
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Trigger notification event
    await handleEvent('REGISTRATION_REJECTED', {
      userId: user._id,
      userType: userType,
      userName: user.name || user.firstName,
      rejectionReason: rejectionReason
    });

    res.json({
      success: true,
      message: 'User registration rejected successfully',
      data: user
    });
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Approve KYC verification
 */
exports.approveKyc = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    
    let user;
    let updateData = { kycStatus: 'approved' };
    
    if (userType === 'female') {
      user = await FemaleUser.findByIdAndUpdate(userId, updateData, { new: true });
    } else if (userType === 'agency') {
      user = await AgencyUser.findByIdAndUpdate(userId, updateData, { new: true });
    } else if (userType === 'male') {
      user = await MaleUser.findByIdAndUpdate(userId, updateData, { new: true });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Trigger notification event
    await handleEvent('KYC_APPROVED', {
      userId: user._id,
      userType: userType,
      userName: user.name || user.firstName
    });

    res.json({
      success: true,
      message: 'KYC verification approved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error approving KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reject KYC verification
 */
exports.rejectKyc = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const { rejectionReason } = req.body;
    
    let user;
    let updateData = { kycStatus: 'rejected' };
    
    if (userType === 'female') {
      user = await FemaleUser.findByIdAndUpdate(userId, updateData, { new: true });
    } else if (userType === 'agency') {
      user = await AgencyUser.findByIdAndUpdate(userId, updateData, { new: true });
    } else if (userType === 'male') {
      user = await MaleUser.findByIdAndUpdate(userId, updateData, { new: true });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Trigger notification event
    await handleEvent('KYC_REJECTED', {
      userId: user._id,
      userType: userType,
      userName: user.name || user.firstName,
      rejectionReason: rejectionReason
    });

    res.json({
      success: true,
      message: 'KYC verification rejected successfully',
      data: user
    });
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Approve withdrawal request
 */
exports.approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    // Assuming you have a Withdrawal model
    const Withdrawal = require('../../models/common/Withdrawal');
    
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      withdrawalId,
      { 
        status: 'approved',
        processedAt: new Date()
      },
      { new: true }
    ).populate('userId');
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Trigger notification event
    await handleEvent('WITHDRAWAL_APPROVED', {
      userId: withdrawal.userId._id,
      userType: withdrawal.userType,
      userName: withdrawal.userId.name || withdrawal.userId.firstName,
      amount: withdrawal.amount,
      currency: withdrawal.currency
    });

    res.json({
      success: true,
      message: 'Withdrawal request approved successfully',
      data: withdrawal
    });
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reject withdrawal request
 */
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const { rejectionReason } = req.body;
    
    const Withdrawal = require('../../models/common/Withdrawal');
    
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      withdrawalId,
      { 
        status: 'rejected',
        rejectionReason: rejectionReason,
        processedAt: new Date()
      },
      { new: true }
    ).populate('userId');
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    // Trigger notification event
    await handleEvent('WITHDRAWAL_REJECTED', {
      userId: withdrawal.userId._id,
      userType: withdrawal.userType,
      userName: withdrawal.userId.name || withdrawal.userId.firstName,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      rejectionReason: rejectionReason
    });

    res.json({
      success: true,
      message: 'Withdrawal request rejected successfully',
      data: withdrawal
    });
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

## 👥 USER CONTROLLERS

### notificationController.js (Common)
```javascript
// src/controllers/common/notificationController.js
const { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getNotificationCount 
} = require('../../services/notificationService');

/**
 * Get user notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 50, skip = 0, unreadOnly = false } = req.query;
    
    const notifications = await getUserNotifications(
      req.user.id,
      req.userType,
      parseInt(limit),
      parseInt(skip)
    );
    
    // Filter unread if requested
    let filteredNotifications = notifications;
    if (unreadOnly === 'true') {
      filteredNotifications = notifications.filter(n => !n.isRead);
    }
    
    const totalCount = await getNotificationCount(req.user.id, req.userType);
    const unreadCount = await getNotificationCount(req.user.id, req.userType, true);
    
    res.json({
      success: true,
      data: filteredNotifications,
      meta: {
        totalCount: totalCount,
        unreadCount: unreadCount,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await markNotificationAsRead(
      notificationId,
      req.user.id,
      req.userType
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await markAllNotificationsAsRead(req.user.id, req.userType);
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get notification counts
 */
exports.getNotificationCounts = async (req, res) => {
  try {
    const totalCount = await getNotificationCount(req.user.id, req.userType);
    const unreadCount = await getNotificationCount(req.user.id, req.userType, true);
    
    res.json({
      success: true,
      data: {
        total: totalCount,
        unread: unreadCount
      }
    });
  } catch (error) {
    console.error('Error getting notification counts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

## 🌐 ROUTES

### notificationRoutes.js (Common)
```javascript
// src/routes/common/notificationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const notificationController = require('../../controllers/common/notificationController');

// Get user notifications
router.get('/', auth, notificationController.getNotifications);

// Mark single notification as read
router.put('/:notificationId/read', auth, notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', auth, notificationController.markAllAsRead);

// Get notification counts
router.get('/counts', auth, notificationController.getNotificationCounts);

module.exports = router;
```

### adminNotificationRoutes.js
```javascript
// src/routes/adminRoutes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const adminController = require('../../controllers/adminControllers/adminController');
const { isAdmin } = require('../../middlewares/permissionMiddleware');

// Apply admin middleware to all routes
router.use(auth, isAdmin);

// Registration approval/rejection
router.put('/users/:userType/:userId/approve', adminController.approveRegistration);
router.put('/users/:userType/:userId/reject', adminController.rejectRegistration);

// KYC approval/rejection
router.put('/users/:userType/:userId/kyc/approve', adminController.approveKyc);
router.put('/users/:userType/:userId/kyc/reject', adminController.rejectKyc);

// Withdrawal approval/rejection
router.put('/withdrawals/:withdrawalId/approve', adminController.approveWithdrawal);
router.put('/withdrawals/:withdrawalId/reject', adminController.rejectWithdrawal);

module.exports = router;
```

## 🖥️ HTML TEST FILES

### fcm-notification-test.html
```html
<!-- public/fcm-notification-test.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FCM Notification Test</title>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>
  
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .token-display {
      background: #e8f4f8;
      border: 2px dashed #2196f3;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
      word-break: break-all;
      font-family: monospace;
    }
    .notification-log {
      background: #f9f9f9;
      border: 1px solid #ddd;
      height: 200px;
      overflow-y: auto;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
    }
    button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 12px 20px;
      margin: 5px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover { background: #1976d2; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    input {
      padding: 10px;
      width: 100%;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 5px;
      box-sizing: border-box;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    h1 { color: #2196f3; text-align: center; }
    h2 { color: #333; border-bottom: 2px solid #2196f3; padding-bottom: 5px; }
    .step { margin: 15px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <h1>🔔 FCM Notification Testing Panel</h1>
  
  <!-- STEP 1: Firebase Setup -->
  <div class="container">
    <h2>Step 1: Firebase Setup</h2>
    <div class="step">
      <strong>Status:</strong> <span id="firebaseStatus">Initializing...</span>
    </div>
    <button onclick="initializeFirebase()">Initialize Firebase</button>
  </div>

  <!-- STEP 2: Get FCM Token -->
  <div class="container">
    <h2>Step 2: Get FCM Token</h2>
    <div class="step">
      <strong>Permissions:</strong> <span id="permissionStatus">Checking...</span>
    </div>
    <button onclick="requestNotificationPermission()">Request Notification Permission</button>
    <button onclick="getFCMToken()">Get FCM Token</button>
    
    <div id="tokenContainer" style="display: none;">
      <h3>Your FCM Token:</h3>
      <div class="token-display" id="fcmToken"></div>
      <button onclick="copyToken()">Copy Token</button>
    </div>
  </div>

  <!-- STEP 3: Test Notifications -->
  <div class="container">
    <h2>Step 3: Test Notifications</h2>
    <div class="step">
      <strong>Notification Status:</strong> <span id="notificationStatus">Not listening</span>
    </div>
    
    <h3>Test with API Call</h3>
    <input type="text" id="apiToken" placeholder="Your JWT Token (from login)">
    <input type="text" id="testMessage" placeholder="Test message content" value="Hello! This is a test notification">
    <button onclick="sendTestNotification()">Send Test Notification via API</button>
    
    <h3>Manual Test</h3>
    <button onclick="sendManualTest()">Send Manual Test Notification</button>
  </div>

  <!-- STEP 4: Notification Log -->
  <div class="container">
    <h2>Step 4: Notification Log</h2>
    <div class="notification-log" id="notificationLog">
      <!-- Notifications will appear here -->
    </div>
    <button onclick="clearLog()">Clear Log</button>
  </div>

  <script>
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
      authDomain: "friendcircle-notifications.firebaseapp.com",
      projectId: "friendcircle-notifications",
      storageBucket: "friendcircle-notifications.firebasestorage.app",
      messagingSenderId: "336749988199",
      appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
      measurementId: "G-DP46EJ1FRW"
    };

    let messaging;
    let fcmToken = null;

    // Initialize Firebase
    function initializeFirebase() {
      try {
        firebase.initializeApp(firebaseConfig);
        messaging = firebase.messaging();
        
        // Handle foreground messages
        messaging.onMessage((payload) => {
          logNotification('Foreground message received:', payload);
          showNotificationInUI(payload);
        });
        
        document.getElementById('firebaseStatus').textContent = 'Firebase initialized successfully!';
        document.getElementById('firebaseStatus').className = 'status success';
        
        // Check existing permission status
        checkPermissionStatus();
        
      } catch (error) {
        logError('Firebase initialization failed:', error);
        document.getElementById('firebaseStatus').textContent = 'Failed: ' + error.message;
        document.getElementById('firebaseStatus').className = 'status error';
      }
    }

    // Check notification permission status
    function checkPermissionStatus() {
      if ('Notification' in window) {
        const permission = Notification.permission;
        const statusElement = document.getElementById('permissionStatus');
        
        switch(permission) {
          case 'granted':
            statusElement.textContent = 'Permission granted ✅';
            statusElement.className = 'status success';
            break;
          case 'denied':
            statusElement.textContent = 'Permission denied ❌';
            statusElement.className = 'status error';
            break;
          case 'default':
            statusElement.textContent = 'Permission not requested yet';
            statusElement.className = 'status info';
            break;
        }
      }
    }

    // Request notification permission
    function requestNotificationPermission() {
      if (!('Notification' in window)) {
        alert('This browser does not support desktop notification');
        return;
      }

      Notification.requestPermission().then((permission) => {
        checkPermissionStatus();
        
        if (permission === 'granted') {
          logInfo('Notification permission granted');
        } else {
          logError('Notification permission denied');
        }
      });
    }

    // Get FCM token
    async function getFCMToken() {
      if (!messaging) {
        logError('Firebase messaging not initialized');
        return;
      }

      try {
        // Request permission first if not granted
        if (Notification.permission !== 'granted') {
          await requestNotificationPermission();
          if (Notification.permission !== 'granted') {
            throw new Error('Notification permission required');
          }
        }

        // Get FCM token
        fcmToken = await messaging.getToken({ 
          vapidKey: 'BC8p55Y1p4bqo5bVbVrK0f1r9h4s7u2i3n5g6k7e8y9p1a2s3s4w5o6r7d8k9e0y1p2a3s4s5w6o7r8d9k0e1y2p3a4s5s6w7o8r9d0k1e2y3p4a5s6s7w8o9r0d1k2e3y4p5a6s7s8w9o0' 
        });
        
        document.getElementById('fcmToken').textContent = fcmToken;
        document.getElementById('tokenContainer').style.display = 'block';
        
        logInfo('FCM Token retrieved successfully');
        document.getElementById('notificationStatus').textContent = 'Listening for notifications...';
        document.getElementById('notificationStatus').className = 'status success';
        
      } catch (error) {
        logError('Failed to get FCM token:', error);
        document.getElementById('notificationStatus').textContent = 'Failed to get token: ' + error.message;
        document.getElementById('notificationStatus').className = 'status error';
      }
    }

    // Copy token to clipboard
    function copyToken() {
      if (fcmToken) {
        navigator.clipboard.writeText(fcmToken).then(() => {
          logInfo('Token copied to clipboard');
          alert('Token copied to clipboard!');
        }).catch(err => {
          logError('Failed to copy token:', err);
        });
      }
    }

    // Send test notification via API
    async function sendTestNotification() {
      const jwtToken = document.getElementById('apiToken').value;
      const message = document.getElementById('testMessage').value;
      
      if (!jwtToken) {
        alert('Please enter your JWT token');
        return;
      }
      
      if (!fcmToken) {
        alert('Please get FCM token first');
        return;
      }

      try {
        // You'll need to implement this endpoint in your backend
        const response = await fetch('/api/test-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            fcmToken: fcmToken,
            title: 'Test Notification',
            body: message,
            data: {
              type: 'test',
              timestamp: new Date().toISOString()
            }
          })
        });

        const result = await response.json();
        logInfo('API Response:', result);
        
        if (result.success) {
          logInfo('Test notification sent successfully');
        } else {
          logError('Failed to send notification:', result.error);
        }
      } catch (error) {
        logError('API call failed:', error);
      }
    }

    // Send manual test notification (simulates receiving one)
    function sendManualTest() {
      const payload = {
        notification: {
          title: 'Manual Test Notification',
          body: 'This is a manually triggered test notification at ' + new Date().toLocaleTimeString()
        },
        data: {
          type: 'manual_test',
          timestamp: new Date().toISOString()
        }
      };
      
      showNotificationInUI(payload);
      logNotification('Manual test notification created:', payload);
    }

    // Show notification in UI
    function showNotificationInUI(payload) {
      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body || 'No message';
      
      // Create browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/favicon.ico'
        });
      }
      
      // Add to notification log
      const logEntry = document.createElement('div');
      logEntry.innerHTML = `
        <strong>${title}</strong><br>
        ${body}<br>
        <small>${new Date().toLocaleString()}</small>
        <hr>
      `;
      document.getElementById('notificationLog').prepend(logEntry);
    }

    // Logging functions
    function logInfo(message, data) {
      console.log('ℹ️ INFO:', message, data || '');
      addToLog('INFO', message, data);
    }

    function logError(message, data) {
      console.error('❌ ERROR:', message, data || '');
      addToLog('ERROR', message, data);
    }

    function logNotification(message, data) {
      console.log('🔔 NOTIFICATION:', message, data || '');
      addToLog('NOTIFICATION', message, data);
    }

    function addToLog(type, message, data) {
      const logEntry = document.createElement('div');
      logEntry.innerHTML = `
        <strong>[${type}]</strong> ${message} ${data ? JSON.stringify(data) : ''}
        <br><small>${new Date().toLocaleString()}</small>
        <hr>
      `;
      document.getElementById('notificationLog').prepend(logEntry);
    }

    function clearLog() {
      document.getElementById('notificationLog').innerHTML = '';
    }

    // Initialize on page load
    window.onload = function() {
      logInfo('Page loaded. Click "Initialize Firebase" to start.');
    };
  </script>
</body>
</html>
```

## 🧪 TESTING INSTRUCTIONS

### 1. Set Up Firebase Configuration
Make sure your Firebase configuration is correct in the HTML file and that you have:
- Firebase project set up
- Firebase Admin SDK configured
- FCM enabled

### 2. Start the Server
```bash
npm start
```

### 3. Test FCM Notifications
1. Open `http://localhost:3000/fcm-notification-test.html`
2. Click "Initialize Firebase"
3. Click "Request Notification Permission" 
4. Click "Get FCM Token"
5. Copy the FCM token
6. Test with manual notifications or API calls

### 4. Test Admin Actions
Use the following API endpoints:

**Registration Approval:**
```bash
PUT /admin/users/female/{userId}/approve
Authorization: Bearer ADMIN_JWT_TOKEN
```

**KYC Approval:**
```bash
PUT /admin/users/female/{userId}/kyc/approve
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Withdrawal Approval:**
```bash
PUT /admin/withdrawals/{withdrawalId}/approve
Authorization: Bearer ADMIN_JWT_TOKEN
```

### 5. Monitor Notifications
- Check browser console for logs
- Check notification panel for received notifications
- Verify FCM messages in Firebase Console

## 🛡️ SECURITY CONSIDERATIONS

1. **Authentication**: All notification endpoints require valid JWT tokens
2. **Authorization**: Admin actions require admin permissions
3. **Rate Limiting**: Implement rate limiting for notification endpoints
4. **Input Validation**: Validate all notification data
5. **Error Handling**: Graceful error handling without exposing sensitive information

## 📊 MONITORING & LOGGING

The system includes comprehensive logging for:
- Notification creation events
- FCM delivery status
- Socket.IO message delivery
- Error tracking
- Performance metrics

## 🔧 TROUBLESHOOTING

**Common Issues:**
1. **FCM Token Not Generated**: Check notification permissions
2. **Notifications Not Received**: Verify Firebase configuration
3. **401 Errors**: Check JWT token validity
4. **403 Errors**: Verify user permissions
5. **500 Errors**: Check server logs for detailed errors

This complete notification system provides real-time notifications for all user types with comprehensive admin controls and robust testing capabilities.