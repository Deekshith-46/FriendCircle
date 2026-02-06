# Admin Panel Notification Integration Guide

## Overview
This document explains how to integrate notifications in the Admin Panel for the Friend Circle application. The admin panel receives two types of notifications:
1. Status updates (registration, KYC, withdrawal approvals/rejections)
2. System alerts and monitoring

## Firebase Configuration

### Backend Firebase Settings
The backend uses Firebase Admin SDK with the following configuration:
- **Project ID**: friendcircle-notifications
- **Service Account**: Located at `/config/firebaseServiceAccount.json`
- **API Key**: AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo
- **Client Email**: firebase-adminsdk-fbsvc@friendcircle-notifications.iam.gserviceaccount.com

### Frontend Firebase Settings
For admin panel, use these Firebase configuration values:
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

## Notification Types for Admin Panel

### 1. Registration & Approval Notifications
- **New Account Pending Approval**: Sent when a user registers and needs admin approval
- **KYC Documents Submitted**: Sent when users submit KYC documents for review
- **Withdrawal Requests**: Sent when users request withdrawals

### 2. System Monitoring Notifications
- **Admin-Wide Alerts**: Notifications broadcast to all admin users
- **System Maintenance**: Maintenance notifications
- **Feature Announcements**: New feature releases

## Integration Steps

### Step 1: Initialize Firebase in Admin Panel
```javascript
// Import Firebase
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

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
            
            // Send token to backend
            await fetch('/api/notification/save-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
                },
                body: JSON.stringify({
                    fcmToken: token,
                    deviceId: 'admin-web',
                    platform: 'web'
                })
            });
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
    }
};
```

### Step 2: Subscribe to Admin Notifications
Admin users receive notifications through a dedicated socket room called `admins_room`. You need to join this room when the admin panel loads:

```javascript
// Join the admin notifications room via WebSocket
const socket = io('your-server-url');
socket.emit('join_admin_notifications');

// Listen for admin notifications
socket.on('notification', (data) => {
    // Handle admin notification
    showNotification(data.title, data.message, data.type);
});
```

### Step 3: Display Notification Panel
Admins can fetch their notifications using the following endpoint:

```javascript
// Fetch admin notifications
const fetchAdminNotifications = async (page = 1, limit = 20, type = null, isRead = false) => {
    const params = new URLSearchParams({
        page,
        limit,
        ...(type && { type }),
        isRead
    });
    
    const response = await fetch(`/api/admin/notifications?${params}`, {
        headers: {
            'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
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
            'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
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
            'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
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
            'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
        }
    });
    
    const result = await response.json();
    return result.data.unreadCount;
};
```

## Why This Integration is Needed

### For Status Updates
Admins need to be immediately notified when:
- New users register and require approval
- Users submit KYC documents for verification
- Users request withdrawals that need processing

### For System Monitoring
Admins need to monitor the system and respond to:
- High-priority issues
- System maintenance schedules
- Feature updates and announcements

## Result of Integration

After implementing the notification system:

1. **Real-time Updates**: Admins receive instant notifications when users submit registrations, KYC documents, or withdrawal requests
2. **Efficient Processing**: Admins can quickly respond to pending items, improving user experience
3. **Centralized Monitoring**: All important system events are consolidated in one place
4. **Improved Workflow**: Admins can prioritize tasks based on notification urgency
5. **Better User Experience**: Faster response times lead to happier users

## Common Notification Events

| Event | Description |
|-------|-------------|
| ACCOUNT_APPROVAL_REQUEST | New user registration pending approval |
| KYC_SUBMITTED | User submitted KYC documents |
| WITHDRAWAL_REQUEST | User requested withdrawal |
| SYSTEM_MAINTENANCE | Scheduled system maintenance |
| FEATURE_ANNOUNCEMENT | New features released |

The admin notification system is designed to be centralized, with all admin users receiving notifications through the `admins_room` socket room, ensuring everyone stays informed about critical events.