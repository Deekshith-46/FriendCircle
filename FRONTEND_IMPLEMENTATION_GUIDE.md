# 🎯 Frontend Implementation Guide - Complete Notification System

## 🔍 DOES THE FEATURE EXIST?

**YES** - The complete notification system exists in your code! Here's what's implemented:

### ✅ Automatic Notifications When Users Register:
- **Female Users**: When they register → Automatic notification sent to admin
- **Agency Users**: When they register → Automatic notification sent to admin
- **Admin Actions**: When admin approves/rejects → Automatic notification sent to user

### ✅ Current Working Implementation:
```javascript
// Female registration triggers this automatically:
await notificationService.handleEvent(notificationEvents.ACCOUNT_APPROVAL_REQUEST, {
  entityId: newUser._id.toString(),
  entityType: 'female',
  email: newUser.email,
  mobileNumber: newUser.mobileNumber
});

// Agency registration triggers this automatically:
await notificationService.handleEvent(notificationEvents.ACCOUNT_APPROVAL_REQUEST, {
  entityId: newAgency._id.toString(),
  entityType: 'agency',
  email: newAgency.email,
  mobileNumber: newAgency.mobileNumber
});
```

---

## 📋 WHAT YOU NEED TO PROVIDE TO FRONTEND DEVELOPERS

### 📍 SERVER URLS
Replace `YOUR_SERVER_URL` with your actual server URL (e.g., `http://localhost:3000` or `https://yourdomain.com`)

---

## 👨‍💼 ADMIN PANEL DEVELOPERS - What You Need

### 1. WebSocket Connection
```javascript
const socket = io('YOUR_SERVER_URL'); // e.g., http://localhost:3000
```

### 2. Join Admin Notifications Room
```javascript
// After successful admin login:
socket.emit('join_admin_notifications');
```

### 3. Listen for Notifications
```javascript
socket.on('notification', (data) => {
  console.log('Admin received notification:', data);
  // Display in notification panel
  showNotification(data.title, data.message, data.type);
});
```

### 4. Available APIs
```javascript
// Get admin notification history
GET YOUR_SERVER_URL/notification-panel/admin/notifications
Headers: {
  'Authorization': 'Bearer ADMIN_JWT_TOKEN'
}

// Mark notification as read
PUT YOUR_SERVER_URL/notification-panel/admin/notifications/{notificationId}/read
Headers: {
  'Authorization': 'Bearer ADMIN_JWT_TOKEN'
}

// Mark all notifications as read
PUT YOUR_SERVER_URL/notification-panel/admin/notifications/mark-all-read
Headers: {
  'Authorization': 'Bearer ADMIN_JWT_TOKEN'
}
```

### 5. Required Admin Actions
Use your existing admin APIs:
```javascript
// Approve user registration
PUT YOUR_SERVER_URL/admin/users/{userType}/{userId}/approve
Headers: { 'Authorization': 'Bearer ADMIN_JWT_TOKEN' }

// Reject user registration  
PUT YOUR_SERVER_URL/admin/users/{userType}/{userId}/reject
Headers: { 'Authorization': 'Bearer ADMIN_JWT_TOKEN' }

// Approve KYC
PUT YOUR_SERVER_URL/admin/users/{userType}/{userId}/kyc/approve
Headers: { 'Authorization': 'Bearer ADMIN_JWT_TOKEN' }

// Reject KYC
PUT YOUR_SERVER_URL/admin/users/{userType}/{userId}/kyc/reject
Headers: { 'Authorization': 'Bearer ADMIN_JWT_TOKEN' }

// Approve Withdrawal
PUT YOUR_SERVER_URL/admin/withdrawals/{withdrawalId}/approve
Headers: { 'Authorization': 'Bearer ADMIN_JWT_TOKEN' }

// Reject Withdrawal
PUT YOUR_SERVER_URL/admin/withdrawals/{withdrawalId}/reject
Headers: { 'Authorization': 'Bearer ADMIN_JWT_TOKEN' }
```

---

## 👤 USER PANEL DEVELOPERS - What You Need

### 1. WebSocket Connection
```javascript
const socket = io('YOUR_SERVER_URL'); // e.g., http://localhost:3000
```

### 2. Join User Notifications Room
```javascript
// After successful user login:
const userType = 'female'; // or 'male' or 'agency'
const userId = 'CURRENT_USER_ID'; // from your auth system

socket.emit('join_notifications', { userType, userId });
```

### 3. Listen for Notifications
```javascript
socket.on('notification', (data) => {
  console.log('User received notification:', data);
  // Display in notification panel
  showNotification(data.title, data.message, data.type);
});
```

### 4. Available APIs
```javascript
// Get user notification history
GET YOUR_SERVER_URL/notification-panel/notifications
Headers: {
  'Authorization': 'Bearer USER_JWT_TOKEN'
}
Query params: {
  page: 1,
  limit: 20,
  type: 'all', // optional: 'account_approved', 'kyc_approved', etc.
  isRead: false // optional
}

// Mark notification as read
PUT YOUR_SERVER_URL/notification-panel/notifications/{notificationId}/read
Headers: {
  'Authorization': 'Bearer USER_JWT_TOKEN'
}

// Mark all notifications as read
PUT YOUR_SERVER_URL/notification-panel/notifications/mark-all-read
Headers: {
  'Authorization': 'Bearer USER_JWT_TOKEN'
}

// Get unread count
GET YOUR_SERVER_URL/notification-panel/notifications/unread-count
Headers: {
  'Authorization': 'Bearer USER_JWT_TOKEN'
}
```

### 5. FCM Push Notifications Setup
```javascript
// Firebase configuration (same for all users)
const firebaseConfig = {
  apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
  authDomain: "friendcircle-notifications.firebaseapp.com", 
  projectId: "friendcircle-notifications",
  storageBucket: "friendcircle-notifications.firebasestorage.app",
  messagingSenderId: "336749988199",
  appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
  measurementId: "G-DP46EJ1FRW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Request notification permission
const permission = await Notification.requestPermission();

// Get FCM token
const messaging = firebase.messaging();
const fcmToken = await messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' });

// Send token to backend
await fetch('YOUR_SERVER_URL/notification/save-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    fcmToken: fcmToken,
    deviceType: 'web' // or 'android' or 'ios'
  })
});
```

---

## 🔄 COMPLETE WORKFLOW EXAMPLE

### When User Registers:
1. **User** submits registration → Backend saves pending user
2. **Backend** automatically sends notification to admin: "New registration pending approval"
3. **Admin** receives real-time notification in admin panel via WebSocket
4. **Admin** clicks "Approve" → Calls admin API to update user status
5. **Backend** automatically sends notification to user: "Account approved!"
6. **User** receives real-time notification via WebSocket + stored in database

### When Admin Takes Action:
1. **Admin** approves/rejects user/KYC/withdrawal via API
2. **Backend** automatically sends appropriate notification to user
3. **User** receives notification immediately via WebSocket + stored in database

---

## 📱 NOTIFICATION TYPES

### Admin Panel Receives:
- `account_approval_request` - New user registration pending approval
- `kyc_submitted` - User submitted KYC documents
- `withdrawal_request` - User requested withdrawal

### User Panel Receives:
- `account_approved` - Account approved by admin
- `account_rejected` - Account rejected by admin
- `kyc_approved` - KYC documents approved
- `kyc_rejected` - KYC documents rejected
- `withdrawal_approved` - Withdrawal request approved
- `withdrawal_rejected` - Withdrawal request rejected

---

## 🛠️ SIMPLE INTEGRATION CHECKLIST

### For Admin Developers:
- [ ] Connect to WebSocket using your server URL
- [ ] Join admin notifications room after login
- [ ] Listen for 'notification' events
- [ ] Display notifications in UI
- [ ] Implement approve/reject buttons (call existing admin APIs)
- [ ] Backend automatically notifies users

### For User Developers:
- [ ] Connect to WebSocket using your server URL
- [ ] Join user-specific notifications room after login
- [ ] Listen for 'notification' events
- [ ] Display notifications in UI
- [ ] Implement notification history page using API
- [ ] Implement mark as read functionality
- [ ] Set up FCM push notifications (optional but recommended)

---

## 🔧 TROUBLESHOOTING

### Common Issues:

**1. Not receiving notifications:**
- Check WebSocket connection is established
- Verify correct room joining (`join_admin_notifications` for admin, `join_notifications` for users)
- Ensure JWT token is valid in headers

**2. 404 errors with APIs:**
- Use the correct endpoints from this guide
- Make sure server is running on the correct URL
- Check authentication headers are included

**3. Notifications not showing in UI:**
- Check browser console for WebSocket connection logs
- Verify event listener is properly set up
- Ensure notification display function is working

**4. FCM push notifications not working:**
- Verify Firebase configuration is correct
- Check VAPID key is set up properly
- Ensure notification permission is granted

---

## 🎯 KEY POINTS FOR FRONTEND TEAM

### What Backend Provides:
✅ Automatic notifications for all events (no manual triggering needed)
✅ Real-time WebSocket delivery
✅ Database storage for history
✅ FCM push notifications
✅ Proper authentication and security

### What Frontend Needs to Implement:
✅ WebSocket connection and room joining
✅ Event listeners for notifications
✅ UI to display notifications
✅ API calls for history and read status
✅ FCM token management (for push notifications)

### What Backend Developers DON'T Need to Do:
❌ Manually send notifications - happens automatically
❌ Manage WebSocket connections - handled by backend
❌ Store notification data - done automatically
❌ Handle FCM delivery - backend service manages this

The system is **100% automated** - your frontend just needs to connect and display the notifications!