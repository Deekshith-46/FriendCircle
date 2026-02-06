# User Panel Notification Integration Guide (Male, Female, Agency)

## Overview
This document explains how to integrate notifications in the User Panels (Male, Female, and Agency) for the Friend Circle application. The user panels receive two main types of notifications:
1. Status updates (registration, KYC, withdrawal approvals/rejections)
2. Chat notifications for conversations

## Firebase Configuration

### Backend Firebase Settings
The backend uses Firebase Admin SDK with the following configuration:
- **Project ID**: friendcircle-notifications
- **Service Account**: Located at `/config/firebaseServiceAccount.json`
- **API Key**: AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo
- **Client Email**: firebase-adminsdk-fbsvc@friendcircle-notifications.iam.gserviceaccount.com

### Frontend Firebase Settings
For user panels, use these Firebase configuration values:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
    authDomain: "friendcircle-notifications.firebaseapp.com",
    projectId: "friendcircle-notifications",
    storageBucket: "friendcircle-notifications.firebasestorage.app",
    messagingSenderId: "336749988199",
    appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
    measurementId: "G-DP46EJ1FRW"
};
```

## Notification Types for User Panels

### 1. Status Update Notifications
- **Account Approved**: Sent when admin approves your account
- **Account Rejected**: Sent when admin rejects your account
- **KYC Approved**: Sent when admin approves your KYC documents
- **KYC Rejected**: Sent when admin rejects your KYC documents
- **Withdrawal Approved**: Sent when admin approves your withdrawal
- **Withdrawal Rejected**: Sent when admin rejects your withdrawal

### 2. Chat Notifications
- **New Chat Messages**: Received when someone sends you a message
- **Room Messages**: Received in group chat rooms you're participating in
- **Message Previews**: Shows the content of incoming messages

## Integration Steps

### Step 1: Initialize Firebase in User Panel
```javascript
// Import Firebase
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Initialize Firebase
const firebaseConfig = {
    // Use the config values mentioned above
};
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get FCM token
const requestPermission = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { 
                vapidKey: 'your-vapid-key-here' 
            });
            
            // Send token to backend with user type
            await fetch('/api/notification/save-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_USER_TOKEN'
                },
                body: JSON.stringify({
                    fcmToken: token,
                    deviceId: 'user-device-id',
                    platform: 'web'  // or 'android' or 'ios'
                })
            });
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
    }
};

// Handle foreground messages
onMessage(messaging, (payload) => {
    // Handle incoming messages when the app is in foreground
    showNotification(payload.notification.title, payload.notification.body);
});
```

### Step 2: Subscribe to User-Specific Notifications
Users receive notifications through their specific socket room based on user type and ID: `{userType}_{userId}`. You need to join this room when the user panel loads:

```javascript
// Join the user-specific notifications room via WebSocket
const socket = io('your-server-url');
const userType = 'male'; // or 'female' or 'agency'
const userId = 'current-user-id';
socket.emit('join_notifications', { userType, userId });

// Listen for user notifications
socket.on('notification', (data) => {
    // Handle user notification
    showNotification(data.title, data.message, data.type);
});
```

### Step 3: Display Notification Panel
Users can fetch their notifications using the following endpoint:

```javascript
// Fetch user notifications
const fetchUserNotifications = async (page = 1, limit = 20, type = null, isRead = false) => {
    const params = new URLSearchParams({
        page,
        limit,
        ...(type && { type }),
        isRead
    });
    
    const response = await fetch(`/api/notifications?${params}`, {
        headers: {
            'Authorization': 'Bearer YOUR_USER_TOKEN'
        }
    });
    
    return response.json();
};
```

### Step 4: Mark Notifications as Read
```javascript
// Mark a specific notification as read
const markNotificationAsRead = async (notificationId) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_USER_TOKEN'
        }
    });
    
    return response.json();
};

// Mark all notifications as read
const markAllNotificationsAsRead = async () => {
    const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_USER_TOKEN'
        }
    });
    
    return response.json();
};
```

### Step 5: Get Unread Count
```javascript
// Get unread notification count
const getUnreadCount = async () => {
    const response = await fetch('/api/notifications/unread-count', {
        headers: {
            'Authorization': 'Bearer YOUR_USER_TOKEN'
        }
    });
    
    const result = await response.json();
    return result.data.unreadCount;
};
```

### Step 6: Handle Chat Notifications
When receiving chat messages, the system automatically sends notifications:

```javascript
// Handle incoming chat notifications
socket.on('notification', (data) => {
    if (data.data.type === 'chat_message') {
        // Handle chat message notification
        showChatNotification(
            data.title, 
            data.message, 
            data.data.senderId, 
            data.data.roomId
        );
    } else {
        // Handle other types of notifications
        showGeneralNotification(data.title, data.message, data.type);
    }
});
```

## Why This Integration is Needed

### For Status Updates
Users need to be immediately notified when:
- Their account registration is approved or rejected
- Their KYC documents are approved or rejected
- Their withdrawal requests are processed

### For Chat Communications
Users need to receive notifications when:
- Someone sends them a direct message
- Someone posts in a chat room they're participating in
- They receive important communication from other users

## Result of Integration

After implementing the notification system:

1. **Real-time Updates**: Users receive instant notifications about their account status, KYC status, and withdrawal requests
2. **Chat Engagement**: Users are notified immediately when they receive new messages
3. **Better Experience**: Users don't need to constantly check the app to stay updated
4. **Prompt Responses**: Users can quickly respond to important updates
5. **Increased Retention**: Regular notifications keep users engaged with the platform

## Common Notification Events

| Event | Description |
|-------|-------------|
| ACCOUNT_APPROVED | Your account has been approved |
| ACCOUNT_REJECTED | Your account has been rejected |
| KYC_APPROVED | Your KYC documents have been approved |
| KYC_REJECTED | Your KYC documents have been rejected |
| WITHDRAWAL_APPROVED | Your withdrawal has been approved |
| WITHDRAWAL_REJECTED | Your withdrawal has been rejected |
| CHAT_MESSAGE | You received a new chat message |
| ROOM_MESSAGE | New message in a chat room you're participating in |

## Common Integration Across User Types

The notification integration is common for all three user types (Male, Female, and Agency) because:

1. **Shared Backend Logic**: All user types use the same notification service and database structure
2. **Unified Socket System**: All users connect to their specific `{userType}_{userId}` room
3. **Standardized API Endpoints**: Same endpoints work for all user types with proper authentication
4. **Consistent Data Structure**: Same notification format regardless of user type
5. **Shared Firebase Configuration**: All users use the same Firebase project

The only difference is the `userType` parameter ('male', 'female', or 'agency') which ensures notifications are delivered to the correct user type.