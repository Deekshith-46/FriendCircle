# Complete Notification System Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Files](#implementation-files)
4. [API Endpoints](#api-endpoints)
5. [API Testing Guide](#api-testing-guide)
6. [Database Schema Changes](#database-schema-changes)

## Overview

This document describes the complete bidirectional push notification system implementation that works for both male ↔ female users with real-time and offline notification capabilities.

### Key Features
- **Bidirectional notifications** (male ↔ female)
- **Real-time messaging** via Socket.IO when users are online
- **Push notifications** via FCM when users are offline
- **Smart routing** based on socket presence (not just onlineStatus)
- **Multiple device support** per user
- **Platform-specific configurations** (iOS/Android)

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Backend   │    │   Firebase  │
│   (Mobile/  │◄──►│   (NodeJS)  │◄──►│   (FCM)     │
│   Web)      │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                        │
                   ┌──────────┐
                   │ SocketIO │
                   │ Presence │
                   └──────────┘
```

### Decision Logic
```
IF user has active socket connection → Send via Socket.IO (real-time)
ELSE IF user has FCM tokens → Send push notification
ELSE → No notification delivery possible
```

## Implementation Files

### 1. Database Schema Updates

**File: `src/models/maleUser/MaleUser.js`**
```javascript
// Push Notification FCM Tokens (support multiple devices)
fcmTokens: [{
  token: { type: String, required: true },
  deviceId: { type: String }, // Optional device identifier
  platform: { type: String, enum: ['ios', 'android', 'web'] },
  createdAt: { type: Date, default: Date.now }
}],
```

**File: `src/models/femaleUser/FemaleUser.js`**
```javascript
// Push Notification FCM Tokens (support multiple devices)
fcmTokens: [{
  token: { type: String, required: true },
  deviceId: { type: String }, // Optional device identifier
  platform: { type: String, enum: ['ios', 'android', 'web'] },
  createdAt: { type: Date, default: Date.now }
}],
```

### 2. Firebase Configuration

**File: `src/config/firebase.js`**
const admin = require('firebase-admin');
const path = require('path');

// Load service account JSON directly
const serviceAccount = require('../../config/firebaseServiceAccount.json');

// Initialize Firebase Admin SDK ONCE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin initialized with service account');
}

// Export messaging
const getMessaging = () => admin.messaging();

module.exports = {
  admin,
  getMessaging,
};

### 3. Socket Instance with Presence Tracking

**File: `src/socketInstance.js`**
```javascript
let io = null;

// Socket presence tracking
const socketPresence = new Map(); // userId:userType -> socketId
const userSocketMap = new Map(); // socketId -> { userId, userType }

module.exports = {
  setIO: (ioInstance) => {
    io = ioInstance;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    return io;
  },
  
  // Presence tracking methods
  addUserSocket: (userId, userType, socketId) => {
    const key = `${userId}:${userType}`;
    socketPresence.set(key, socketId);
    userSocketMap.set(socketId, { userId, userType });
    console.log(`👤 Added socket presence: ${key} -> ${socketId}`);
  },
  
  removeUserSocket: (socketId) => {
    const userInfo = userSocketMap.get(socketId);
    if (userInfo) {
      const key = `${userInfo.userId}:${userInfo.userType}`;
      socketPresence.delete(key);
      userSocketMap.delete(socketId);
      console.log(`👤 Removed socket presence: ${key} <- ${socketId}`);
    }
  },
  
  getSocketIdForUser: (userId, userType) => {
    const key = `${userId}:${userType}`;
    return socketPresence.get(key);
  },
  
  isUserOnline: (userId, userType) => {
    return socketPresence.has(`${userId}:${userType}`);
  },
  
  getAllOnlineUsers: () => {
    const onlineUsers = [];
    for (const [key, socketId] of socketPresence.entries()) {
      const [userId, userType] = key.split(':');
      onlineUsers.push({ userId, userType, socketId });
    }
    return onlineUsers;
  },
  
  getSocketPresence: () => {
    return socketPresence;
  },
  
  getUserSocketMap: () => {
    return userSocketMap;
  }
};
```

### 4. Socket Implementation with Presence Tracking

**File: `src/socket.js`**
```javascript
const socketIO = require('socket.io');
const Message = require('./models/chat/Message');
const ChatRoom = require('./models/chat/ChatRoom');
const { setIO, addUserSocket, removeUserSocket } = require('./socketInstance');

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*'
    }
  });
  
  setIO(io); // Store the io instance globally

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle authentication
    socket.on('authenticate', async (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch user from database to confirm user type (security hardening)
        const FemaleUser = require('./models/femaleUser/FemaleUser');
        const MaleUser = require('./models/maleUser/MaleUser');
        const AdminUser = require('./models/admin/AdminUser');
        const AgencyUser = require('./models/agency/AgencyUser');
        
        let user;
        let userType;
        
        // Try to find user in different collections
        user = await FemaleUser.findById(decoded.id);
        if (user) {
          userType = 'female';
        } else {
          user = await MaleUser.findById(decoded.id);
          if (user) {
            userType = 'male';
          } else {
            user = await AdminUser.findById(decoded.id);
            if (user) {
              userType = 'admin';
            } else {
              user = await AgencyUser.findById(decoded.id);
              if (user) {
                userType = 'agency';
              }
            }
          }
        }
        
        if (!user) {
          throw new Error('User not found');
        }
        
        socket.userId = decoded.id;
        socket.userType = userType;
        
        // Add to presence tracking
        addUserSocket(socket.userId, socket.userType, socket.id);
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_error', { message: 'Invalid token' });
        socket.disconnect();
      }
    });

    // Join chat room
    socket.on('joinRoom', (roomId) => {
      if (!socket.userId || !socket.userType) {
        socket.emit('error', { message: 'Authentication required before joining room' });
        return;
      }
      socket.join(roomId);
      console.log(`User ${socket.id} (type: ${socket.userType}) joined room ${roomId}`);
    });

    // Send message
    socket.on('sendMessage', async (data) => {
      try {
        const {
          roomId,
          type,
          content
        } = data;

        // Use authenticated socket user instead of client-provided values
        const senderId = socket.userId;
        const senderType = socket.userType;

        if (!senderId || !senderType) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const room = await ChatRoom.findOne({
          _id: roomId,
          'participants.userId': senderId
        });

        if (!room) {
          socket.emit('error', { message: 'Chat room not found or unauthorized' });
          return;
        }

        let expireAt = null;
        if (room.isDisappearing) {
          expireAt = new Date(
            Date.now() + room.disappearingAfterHours * 60 * 60 * 1000
          );
        }

        const message = await Message.create({
          chatRoomId: roomId,
          senderId,
          senderType,
          type,
          content,
          expireAt
        });

        // Update last message
        room.lastMessage = content;
        room.lastMessageAt = new Date();
        await room.save();

        // Emit message to room
        io.to(roomId).emit('newMessage', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark message as read (supports both single and bulk)
    socket.on('markAsRead', async (data) => {
      try {
        const {
          roomId,
          messageIds
        } = data;

        // Handle both single messageId (backward compatibility) and array of messageIds
        let idsToProcess = [];
        if (messageIds) {
          idsToProcess = Array.isArray(messageIds) ? messageIds : [messageIds];
        } else if (data.messageId) {
          // Check if messageId is an array or single value
          idsToProcess = Array.isArray(data.messageId) ? data.messageId : [data.messageId];
        }
        
        if (!idsToProcess || idsToProcess.length === 0) {
          socket.emit('error', { message: 'messageIds array is required' });
          return;
        }

        // Use authenticated socket user instead of client-provided values
        const userId = socket.userId;
        const userType = socket.userType;

        if (!userId || !userType) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const room = await ChatRoom.findOne({
          _id: roomId,
          'participants.userId': userId
        });

        if (!room) {
          socket.emit('error', { message: 'Chat room not found or unauthorized' });
          return;
        }

        // Find messages that belong to the room, sent by other users, and not already read by this user
        const messages = await Message.find({
          _id: { $in: idsToProcess },
          chatRoomId: roomId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        });

        if (messages.length > 0) {
          // Update all messages with read status
          for (const message of messages) {
            await Message.findByIdAndUpdate(
              message._id,
              { 
                $push: { 
                  readBy: { 
                    userId: userId, 
                    userType: userType, 
                    readAt: new Date() 
                  } 
                }
              },
              { new: true }
            );
          }

          // Update the room's last read time for this user
          // Remove old entry first to avoid conflicts
          await ChatRoom.updateOne(
            { _id: roomId },
            { $pull: { lastReadBy: { userId: userId } } }
          );
          
          // Add new entry
          await ChatRoom.updateOne(
            { _id: roomId },
            { 
              $push: { 
                lastReadBy: { 
                  userId: userId, 
                  userType: userType, 
                  lastReadAt: new Date() 
                } 
              }
            }
          );

          // Emit read receipt to room (supporting bulk)
          io.to(roomId).emit('messageRead', {
            roomId,
            messageIds: messages.map(m => m._id.toString()),
            readerId: userId,
            readerType: userType,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove from presence tracking
      removeUserSocket(socket.id);
    });
  });

  return io;
};
```

### 5. Notification Service (Updated)

**File: `src/services/notificationService.js`**
```javascript
// src/services/notificationService.js
const { getMessaging } = require('../config/firebase');
const MaleUser = require('../models/maleUser/MaleUser');
const FemaleUser = require('../models/femaleUser/FemaleUser');
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
      user = await MaleUser.findById(userId).select('fcmTokens name');
    } else if (userType === 'female') {
      user = await FemaleUser.findById(userId).select('fcmTokens name');
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
    // Get sender name
    let sender;
    if (senderType === 'male') {
      sender = await MaleUser.findById(senderId).select('name');
    } else if (senderType === 'female') {
      sender = await FemaleUser.findById(senderId).select('name');
    }

    const senderName = sender?.name || 'Unknown User';

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
      // User is online - send via socket only
      const io = getIO();
      if (io) {
        io.to(socketId).emit('newMessageNotification', {
          ...payload,
          messageData
        });
        console.log(`💬 Message sent via socket to ${receiverType} user ${receiverId} (online)`);
        return true;
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
```

### 6. Notification Controller

**File: `src/controllers/common/notificationController.js`**
```javascript
// src/controllers/common/notificationController.js
const { saveFCMToken, removeFCMToken, sendPushNotification } = require('../../services/notificationService');

/**
 * Save FCM token for authenticated user
 * @route POST /notification/save-token
 * @access Private
 */
exports.saveFCMToken = async (req, res) => {
  try {
    const { fcmToken, deviceId, platform } = req.body;
    const userId = req.user.id;
    const userType = req.user.type; // 'male' or 'female'

    // Validate input
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Validate user type
    if (!['male', 'female'].includes(userType)) {
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

    const success = await saveFCMToken(userId, userType, fcmToken, deviceInfo);

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
    const userType = req.user.type;

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
    const userType = req.user.type;

    let User;
    if (userType === 'male') {
      User = require('../../models/maleUser/MaleUser');
    } else if (userType === 'female') {
      User = require('../../models/femaleUser/FemaleUser');
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
```

firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 🔴 SAME firebaseConfig as index.html
firebase.initializeApp({
    apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
    authDomain: "friendcircle-notifications.firebaseapp.com",
    projectId: "friendcircle-notifications",
    storageBucket: "friendcircle-notifications.firebasestorage.app",
    messagingSenderId: "336749988199",
    appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
    measurementId: "G-DP46EJ1FRW"
});

const messaging = firebase.messaging();

// Optional: handle background notifications
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    self.registration.showNotification(
        payload.notification.title,
        {
            body: payload.notification.body,
            icon: '/icon.png'
        }
    );
});


fcm-test/index.html
<!DOCTYPE html>
<html>

<head>
    <title>FCM Token Test</title>
</head>

<body>
    <h2>Firebase Push Notification Test</h2>

    <button onclick="getFCMToken()">Get FCM Token</button>

    <pre id="result"></pre>

    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>

    <script>
        // 🔴 STEP A: Paste your firebaseConfig here
        const firebaseConfig = {
            apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
            authDomain: "friendcircle-notifications.firebaseapp.com",
            projectId: "friendcircle-notifications",
            storageBucket: "friendcircle-notifications.firebasestorage.app",
            messagingSenderId: "336749988199",
            appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
            measurementId: "G-DP46EJ1FRW"
        };


        firebase.initializeApp(firebaseConfig);

        const messaging = firebase.messaging();

        async function getFCMToken() {
            try {
                // Ask permission
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    alert("Notification permission denied");
                    return;
                }

                // 🔴 STEP B: Paste your VAPID key here
                const token = await messaging.getToken({
                    vapidKey: "BIYvvagGTdBsoQuh7ujnR4YNRl57ScQcutv66AHPb5ZsHHhQiwXM7P5oCVja3qriIggIniKsgbZpN_U6fhHj2zs"
                });

                document.getElementById("result").innerText =
                    "FCM TOKEN:\n\n" + token;

                // 🔴 STEP C: Send token to backend
                await fetch("http://localhost:5001/notification/save-token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NWI0OTY3YTQwYWM1ZjM3YTAxOTBlOCIsInR5cGUiOiJmZW1hbGUiLCJpYXQiOjE3NjkwNTgwNzAsImV4cCI6MTc2OTE0NDQ3MH0.Ds6GuTeEfYGj9oKnt1WmvgRpwTbcwcYBMEq7_AsZygY"
                    },
                    body: JSON.stringify({
                        fcmToken: token,
                        deviceId: "browser_1",
                        platform: "web"
                    })
                });

                alert("FCM token sent to backend!");
            } catch (err) {
                console.error(err);
                alert("Error occurred. Check console.");
            }
        }
    </script>
</body>

</html>

### 7. Notification Routes

**File: `src/routes/common/notificationRoutes.js`**
```javascript
// src/routes/common/notificationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const notificationController = require('../../controllers/common/notificationController');

// Save FCM token for push notifications
router.post('/save-token', auth, notificationController.saveFCMToken);

// Remove FCM token (device logout/uninstall)
router.delete('/token', auth, notificationController.removeFCMToken);

// Get registered devices
router.get('/devices', auth, notificationController.getRegisteredDevices);

// Test notification (development/testing only)
router.post('/test', auth, async (req, res) => {
  const { targetUserId, targetType, title, body, data } = req.body;
  const senderUserId = req.user.id;
  const senderUserType = req.user.type;

  // Validate inputs
  if (!targetUserId || !targetType || !title || !body) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: targetUserId, targetType, title, body'
    });
  }

  // Validate user types
  if (!['male', 'female'].includes(targetType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid target user type'
    });
  }

  const payload = {
    title,
    body,
    data: {
      ...data,
      senderId: senderUserId.toString(),
      senderType: senderUserType,
      type: 'test_notification'
    }
  };

  // Import and use sendPushNotification
  const { sendPushNotification } = require('../../services/notificationService');
  const results = await sendPushNotification(targetUserId, targetType, payload);

  const successful = results.filter(r => r.success).length;
  
  if (successful > 0) {
    return res.json({
      success: true,
      message: `Test notification sent successfully to ${successful}/${results.length} devices`,
      data: { results }
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification to any devices'
    });
  }
});

module.exports = router;
```

### 8. App.js Route Registration

**File: `src/app.js`**
```javascript
// Common routes
app.use('/chat', require('./routes/common/chatRoutes'));
app.use('/notification', require('./routes/common/notificationRoutes'));

// Error middleware
app.use(require('./middlewares/errorMiddleware'));

module.exports = app;
```

## API Endpoints

### 1. Save FCM Token
```
POST /notification/save-token
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fcmToken": "your_fcm_token_here",
  "deviceId": "device_identifier",
  "platform": "android" // or "ios", "web"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

### 2. Remove FCM Token
```
DELETE /notification/token
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fcmToken": "your_fcm_token_to_remove"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token removed successfully"
}
```

### 3. Get Registered Devices
```
GET /notification/devices
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceCount": 2,
    "devices": [
      {
        "deviceId": "device_1",
        "platform": "android",
        "registeredAt": "2026-01-21T10:51:41.280Z"
      },
      {
        "deviceId": "device_2",
        "platform": "ios",
        "registeredAt": "2026-01-21T11:23:15.450Z"
      }
    ]
  }
}
```

### 4. Test Notification (Development)
```
POST /notification/test
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "targetUserId": "user_id_to_notify",
  "targetType": "female", // or "male"
  "title": "Test Notification",
  "body": "This is a test message",
  "data": {
    "customField": "customValue"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully to 1/1 devices",
  "data": {
    "results": [
      {
        "success": true,
        "deviceId": "device_1",
        "platform": "android"
      }
    ]
  }
}
```

## API Testing Guide

### 1. Setup and Installation

First, install the required dependency:
```bash
npm install firebase-admin
```

### 2. Environment Variables

Add these to your `.env` file:
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Testing Steps

#### Step 1: Get User Tokens
First, you need valid JWT tokens for both users (sender and receiver):
```bash
# Login to get tokens
curl -X POST "http://localhost:5001/female-user/login" -H "Content-Type: application/json" -d '{"email": "user@example.com", "password": "password"}'
curl -X POST "http://localhost:5001/male-user/login" -H "Content-Type: application/json" -d '{"email": "user@example.com", "password": "password"}'
```

#### Step 2: Register FCM Tokens
Register FCM tokens for both users:
```bash
# For female user
curl -X POST "http://localhost:5001/notification/save-token" \
  -H "Authorization: Bearer <female_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "your_female_fcm_token",
    "deviceId": "device_123",
    "platform": "android"
  }'

# For male user  
curl -X POST "http://localhost:5001/notification/save-token" \
  -H "Authorization: Bearer <male_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "your_male_fcm_token",
    "deviceId": "device_456",
    "platform": "ios"
  }'
```

#### Step 3: Test Notification Delivery
Test sending a notification:
```bash
# Test notification from female to male
curl -X POST "http://localhost:5001/notification/test" \
  -H "Authorization: Bearer <female_user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "<male_user_id>",
    "targetType": "male",
    "title": "New Message",
    "body": "Hello from female user!",
    "data": {
      "conversationId": "conv_123",
      "senderName": "Female User"
    }
  }'
```

#### Step 4: Verify Device Registration
Check registered devices:
```bash
curl -X GET "http://localhost:5001/notification/devices" \
  -H "Authorization: Bearer <user_token>"
```

#### Step 5: Test Chat Message Notification
When sending a chat message, the system will automatically send notifications:
```bash
# Send a chat message (this will trigger notification)
curl -X POST "http://localhost:5001/chat/send" \
  -H "Authorization: Bearer <sender_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_id",
    "type": "text",
    "content": "Hello!"
  }'
```

### 4. Testing Scenarios

#### Scenario 1: Online User (Socket Connected)
1. User is online and has active socket connection
2. Send message → Message delivered via Socket.IO only
3. No FCM push sent (more efficient)

#### Scenario 2: Offline User (No Socket, Has FCM Tokens)
1. User is offline and has FCM tokens registered
2. Send message → FCM push notification sent
3. User receives push notification on device

#### Scenario 3: Multiple Devices Per User
1. User has multiple devices registered
2. Send message → Notification sent to ALL registered devices
3. User receives notification on all devices

#### Scenario 4: User Without FCM Tokens
1. User has no FCM tokens registered
2. Send message → No notification delivered
3. Error logged in backend

### 5. Expected Response Codes

- **200 OK**: Successful operations
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: User not found
- **500 Internal Server Error**: Server error

### 6. Troubleshooting

#### Common Issues:
1. **Firebase not initialized**: Check environment variables
2. **FCM token not found**: User needs to register FCM token first
3. **Socket not connected**: User needs to authenticate with socket
4. **Invalid token**: Token may have expired, login again

#### Debugging Tips:
1. Check server logs for detailed error messages
2. Verify Firebase service account key format
3. Confirm user IDs and types are correct
4. Ensure FCM tokens are valid and not expired

## Database Schema Changes

### MaleUser Schema
- Added `fcmTokens` array field with sub-fields:
  - `token`: String (required)
  - `deviceId`: String (optional)
  - `platform`: String (enum: 'ios', 'android', 'web')
  - `createdAt`: Date (default: Date.now)

### FemaleUser Schema  
- Added `fcmTokens` array field with same sub-fields as above

### Dependencies Added
- `firebase-admin`: For FCM integration
- Socket.IO: For real-time presence tracking

## Recent Updates

### Notification Service Changes
- **Removed icon field** from notification payload in `sendPushNotification` function
- Simplified notification structure to only include `title` and `body`
- Maintains all other functionality including platform-specific configurations

This completes the comprehensive notification system implementation with bidirectional support, real-time delivery, and offline push notifications.