# 📱 COMPLETE NOTIFICATION APIS GUIDE

## 📋 Overview
This guide provides comprehensive information about all notification APIs available in the Friend Circle application, including endpoints, parameters, authentication requirements, and testing instructions.

## 🛠️ AUTHENTICATION REQUIREMENTS

### JWT Token Structure
All notification APIs require a valid JWT token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Supported User Types
- `admin` - Administrative users
- `male` - Male users  
- `female` - Female users
- `agency` - Agency users

## 🎯 USER PANEL NOTIFICATION APIS

### 1. Get User Notifications
**Endpoint:** `GET /api/v1/notifications/user`

**Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Number of notifications per page
- `unreadOnly` (optional, default: false) - Filter for unread notifications only

**Example Requests:**
```bash
# Get all notifications
curl -X GET "http://localhost:5001/api/v1/notifications/user" \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# With pagination
curl -X GET "http://localhost:5001/api/v1/notifications/user?page=1&limit=10" \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# Unread only
curl -X GET "http://localhost:5001/api/v1/notifications/user?unreadOnly=true" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notification_id",
      "title": "Registration Approved",
      "message": "Your account has been approved",
      "type": "account_approved",
      "priority": "high",
      "isRead": false,
      "createdAt": "2024-01-22T10:15:00Z",
      "data": {
        "userId": "user_id",
        "userName": "John Doe"
      }
    }
  ],
  "meta": {
    "totalCount": 25,
    "unreadCount": 3,
    "limit": 20,
    "skip": 0
  }
}
```

### 2. Mark Single Notification as Read
**Endpoint:** `PUT /api/v1/notifications/{notificationId}/read`

**Parameters:**
- `notificationId` (path) - ID of the notification to mark as read

**Example Request:**
```bash
curl -X PUT "http://localhost:5001/api/v1/notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "notification_id",
    "title": "Registration Approved",
    "isRead": true,
    "readAt": "2024-01-22T10:20:00Z"
  }
}
```

### 3. Mark All Notifications as Read
**Endpoint:** `PUT /api/v1/notifications/read-all`

**Example Request:**
```bash
curl -X PUT "http://localhost:5001/api/v1/notifications/read-all" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "modifiedCount": 5
  }
}
```

### 4. Get Notification Counts
**Endpoint:** `GET /api/v1/notifications/counts`

**Example Request:**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/counts" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "unread": 3
  }
}
```

## 👨‍💼 ADMIN PANEL NOTIFICATION APIS

### 1. Get Admin Notifications
**Endpoint:** `GET /api/v1/notifications/admin`

**Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Number of notifications per page
- `unreadOnly` (optional, default: false) - Filter for unread notifications
- `type` (optional) - Filter by notification type
- `receiverType` (optional) - Filter by user type (male/female/agency)

**Example Requests:**
```bash
# Get all admin notifications
curl -X GET "http://localhost:5001/api/v1/notifications/admin" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# With filters
curl -X GET "http://localhost:5001/api/v1/notifications/admin?unreadOnly=true&type=kyc_submitted" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Pagination
curl -X GET "http://localhost:5001/api/v1/notifications/admin?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "title": "New KYC Submission",
        "message": "User john.doe@example.com submitted KYC documents",
        "type": "kyc_submitted",
        "priority": "high",
        "isRead": false,
        "createdAt": "2024-01-22T10:15:00Z",
        "data": {
          "userId": "user_id",
          "userName": "John Doe",
          "userEmail": "john.doe@example.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalNotifications": 22,
      "unreadCount": 7
    }
  }
}
```

### 2. Mark Admin Notification as Read
**Endpoint:** `PUT /api/v1/notifications/admin/{notificationId}/read`

**Example Request:**
```bash
curl -X PUT "http://localhost:5001/api/v1/notifications/admin/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## 🔧 FCM TOKEN MANAGEMENT APIS

### 1. Save FCM Token
**Endpoint:** `POST /api/v1/notification/save-token`

**Request Body:**
```json
{
  "fcmToken": "YOUR_FCM_TOKEN_HERE",
  "deviceId": "device_unique_id",
  "platform": "android" // or "ios" or "web"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:5001/api/v1/notification/save-token" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN_HERE",
    "deviceId": "device123",
    "platform": "android"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

### 2. Remove FCM Token
**Endpoint:** `DELETE /api/v1/notification/token`

**Example Request:**
```bash
curl -X DELETE "http://localhost:5001/api/v1/notification/token" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token removed successfully"
}
```

### 3. Get Registered Devices
**Endpoint:** `GET /api/v1/notification/devices`

**Example Request:**
```bash
curl -X GET "http://localhost:5001/api/v1/notification/devices" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "deviceId": "device123",
      "platform": "android",
      "createdAt": "2024-01-22T10:00:00Z"
    }
  ]
}
```

## 🧪 TESTING NOTIFICATION APIS

### 1. Test Notification (Development Only)
**Endpoint:** `POST /api/v1/notification/test`

**Request Body:**
```json
{
  "targetUserId": "USER_ID_TO_RECEIVE_NOTIFICATION",
  "targetType": "female", // or "male" or "agency"
  "title": "Test Notification",
  "body": "This is a test notification message",
  "data": {
    "customField": "customValue"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:5001/api/v1/notification/test" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "6978a49ddf0e36c658f73f8e",
    "targetType": "female",
    "title": "Test Notification",
    "body": "This is a test notification message",
    "data": {
      "test": "value"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully",
  "data": {
    "results": {
      "push": [
        {
          "success": true,
          "message": "Notification sent via FCM"
        }
      ],
      "db": true
    }
  }
}
```

## 📊 NOTIFICATION TYPES

### User Panel Notification Types:
- `account_approved` - Registration approved
- `account_rejected` - Registration rejected
- `kyc_approved` - KYC verification approved
- `kyc_rejected` - KYC verification rejected
- `withdrawal_approved` - Withdrawal request approved
- `withdrawal_rejected` - Withdrawal request rejected

### Admin Panel Notification Types:
- `account_approval_request` - New user registration request
- `kyc_submitted` - User submitted KYC documents
- `withdrawal_request` - User submitted withdrawal request

## 🔄 WEBSOCKET NOTIFICATIONS

### Admin Panel Events:
- `notification:account_approval_request` - New registration requests
- `notification:kyc_submitted` - New KYC submissions
- `notification:withdrawal_request` - New withdrawal requests

### User Panel Events:
- `notification:account_approved` - User's registration approved
- `notification:account_rejected` - User's registration rejected
- `notification:kyc_approved` - User's KYC approved
- `notification:kyc_rejected` - User's KYC rejected
- `notification:withdrawal_approved` - User's withdrawal approved
- `notification:withdrawal_rejected` - User's withdrawal rejected

### WebSocket Connection:
```javascript
const socket = io('http://localhost:5001');

// For admin users
socket.emit('join_admin_notifications');

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // Handle notification display
});
```

## 🛡️ ERROR RESPONSES

### Common Error Responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Notification not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: field_name"
}
```

## 🔍 TROUBLESHOOTING

### Common Issues:

1. **Authentication Errors**
   - Ensure JWT token is valid and not expired
   - Check correct token type (admin vs user)
   - Verify Authorization header format

2. **Notification Not Received**
   - Check if FCM token is properly registered
   - Verify user has notifications enabled
   - Check Firebase configuration

3. **WebSocket Connection Issues**
   - Ensure socket connection is established
   - Check if user joined correct notification room
   - Verify server is running

4. **Pagination Issues**
   - Ensure page and limit parameters are numbers
   - Check if requested page exists
   - Verify limit is within acceptable range

## 📱 FRONTEND INTEGRATION EXAMPLES

### React/Vue Integration:
```javascript
// Get user notifications
const fetchNotifications = async (page = 1, limit = 20) => {
  try {
    const response = await fetch(`/api/v1/notifications/user?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
};

// Mark as read
const markAsRead = async (notificationId) => {
  try {
    const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};
```

### WebSocket Integration:
```javascript
// Initialize socket connection
const socket = io('http://localhost:5001');

// Join notification room (admin)
if (userType === 'admin') {
  socket.emit('join_admin_notifications');
}

// Listen for notifications
socket.on('notification', (notification) => {
  // Show notification in UI
  showNotification(notification.title, notification.message);
});
```

This comprehensive guide covers all notification APIs available in the Friend Circle application. Each endpoint includes detailed examples, parameters, and expected responses to help with testing and integration.