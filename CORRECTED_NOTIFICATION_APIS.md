# 🔧 COMPLETE CORRECTED NOTIFICATION APIS GUIDE

## 📋 Current Working Notification Endpoints

Based on your existing system, here are ALL the ACTUAL working endpoints:

## ✅ FCM TOKEN MANAGEMENT (Working - `/notification`)
These endpoints are working correctly as you mentioned:

### 1. Save FCM Token
**Endpoint:** `POST /notification/save-token`

**Request Body:**
```json
{
  "fcmToken": "your_female_fcm_token",
  "deviceId": "device_123",
  "platform": "android"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:5001/notification/save-token" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "your_female_fcm_token",
    "deviceId": "device_123",
    "platform": "android"
  }'
```

### 2. Test Notification
**Endpoint:** `POST /notification/test`

**Request Body:**
```json
{
  "targetUserId": "695b4967a40ac5f37a0190e8",
  "targetType": "female",
  "title": "Hello from Backend 🚀",
  "body": "This is a test push notification",
  "data": {
    "screen": "chat",
    "test": "true"
  }
}
```

### 3. Get Registered Devices
**Endpoint:** `GET /notification/devices`

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceCount": 0,
    "devices": []
  }
}
```

## ✅ USER NOTIFICATION PANEL APIS (Working - `/notification-panel`)

### 1. Get User Notifications
**Endpoint:** `GET /notification-panel/notifications`

**Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)  
- `type` (optional) - Filter by notification type
- `isRead` (optional, default: false) - Filter by read status

**Example Requests:**
```bash
# Get all notifications
curl -X GET "http://localhost:5001/notification-panel/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With pagination and filters
curl -X GET "http://localhost:5001/notification-panel/notifications?page=1&limit=10&isRead=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by type
curl -X GET "http://localhost:5001/notification-panel/notifications?type=account_approved" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "6978a49ddf0e36c658f73f8d",
        "title": "Account Approved",
        "message": "Your account has been approved by admin",
        "type": "account_approved",
        "isRead": false,
        "createdAt": "2024-01-22T10:15:00Z",
        "data": {
          "userId": "6978a49ddf0e36c658f73f8e"
        }
      }
    ],
    "totalPages": 3,
    "currentPage": 1,
    "total": 22
  }
}
```

### 2. Mark Notification as Read
**Endpoint:** `PUT /notification-panel/notifications/{id}/read`

**Example Request:**
```bash
curl -X PUT "http://localhost:5001/notification-panel/notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Mark All Notifications as Read
**Endpoint:** `PUT /notification-panel/notifications/read-all`

**Example Request:**
```bash
curl -X PUT "http://localhost:5001/notification-panel/notifications/read-all" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Unread Count
**Endpoint:** `GET /notification-panel/notifications/unread-count`

**Example Request:**
```bash
curl -X GET "http://localhost:5001/notification-panel/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

## ✅ ADMIN NOTIFICATION PANEL APIS (Working - `/notification-panel`)

### 1. Get Admin Notifications
**Endpoint:** `GET /notification-panel/admin/notifications`

**Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `type` (optional) - Filter by notification type
- `receiverType` (optional) - Filter by user type (male/female/agency)
- `isRead` (optional, default: false) - Filter by read status

**Example Requests:**
```bash
# Get all admin notifications (requires admin token)
curl -X GET "http://localhost:5001/notification-panel/admin/notifications" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Filter by type
curl -X GET "http://localhost:5001/notification-panel/admin/notifications?type=account_approval_request" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Filter by user type
curl -X GET "http://localhost:5001/notification-panel/admin/notifications?receiverType=female" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Unread only
curl -X GET "http://localhost:5001/notification-panel/admin/notifications?isRead=false" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# With pagination
curl -X GET "http://localhost:5001/notification-panel/admin/notifications?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "6978a49ddf0e36c658f73f8d",
        "title": "New Registration Request",
        "message": "User john.doe@example.com has registered and needs approval",
        "type": "account_approval_request",
        "receiverType": "female",
        "isRead": false,
        "createdAt": "2024-01-22T10:15:00Z",
        "receiverId": {
          "_id": "6978a49ddf0e36c658f73f8e",
          "name": "John Doe",
          "email": "john.doe@example.com"
        }
      }
    ],
    "totalPages": 2,
    "currentPage": 1,
    "total": 15
  }
}
```

## ❌ WRONG DOCUMENTATION I PROVIDED
I incorrectly documented these endpoints which don't exist in your current system:
- `GET /api/v1/notifications/user` ❌ (Should be: `GET /notification-panel/notifications`)
- `GET /api/v1/notifications/admin` ❌ (Should be: `GET /notification-panel/admin/notifications`)
- `PUT /api/v1/notifications/{id}/read` ❌ (Should be: `PUT /notification-panel/notifications/{id}/read`)
- Other `/api/v1/notifications/*` endpoints ❌

## ✅ COMPLETE ENDPOINT MAPPING

### User Panel Endpoints:
| What You Need | Correct Endpoint | 
|---------------|------------------|
| Get user notifications | `GET /notification-panel/notifications` |
| Mark notification as read | `PUT /notification-panel/notifications/{id}/read` |
| Mark all as read | `PUT /notification-panel/notifications/read-all` |
| Get unread count | `GET /notification-panel/notifications/unread-count` |

### Admin Panel Endpoints:
| What You Need | Correct Endpoint | 
|---------------|------------------|
| Get admin notifications | `GET /notification-panel/admin/notifications` |
| Mark notification as read | `PUT /notification-panel/notifications/{id}/read` |
| Mark all as read | `PUT /notification-panel/notifications/read-all` |
| Get unread count | `GET /notification-panel/notifications/unread-count` |

### FCM Management Endpoints:
| What You Need | Correct Endpoint | 
|---------------|------------------|
| Save FCM token | `POST /notification/save-token` ✅ (Working) |
| Test notification | `POST /notification/test` ✅ (Working) |
| Get devices | `GET /notification/devices` ✅ (Working) |

## 📱 QUICK TESTING

### Test User Notifications:
```bash
# Get your JWT token first (from login)
JWT_TOKEN="your_valid_jwt_token_here"

# Get user notifications
curl -X GET "http://localhost:5001/notification-panel/notifications" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get unread count  
curl -X GET "http://localhost:5001/notification-panel/notifications/unread-count" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Test Admin Notifications:
```bash
# Get admin JWT token first
ADMIN_TOKEN="your_admin_jwt_token_here"

# Get admin notifications
curl -X GET "http://localhost:5001/notification-panel/admin/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get unread admin notifications only
curl -X GET "http://localhost:5001/notification-panel/admin/notifications?isRead=false" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Test FCM Token Management (Your Working Endpoints):
```bash
# Save FCM token (this should work)
curl -X POST "http://localhost:5001/notification/save-token" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test_fcm_token_123",
    "deviceId": "test_device",
    "platform": "android"
  }'

# Test notification (this should work - admin only)
curl -X POST "http://localhost:5001/notification/test" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "YOUR_USER_ID",
    "targetType": "female",
    "title": "Test",
    "body": "Test message"
  }'
```

## 🎯 SUMMARY
The issue was that I documented the wrong endpoint paths. Your system uses:
- `/notification` for FCM token management ✅ (Working)
- `/notification-panel/notifications` for user notifications ✅ (Working)
- `/notification-panel/admin/notifications` for admin notifications ✅ (Working)

**Fix your 404 error by using:**
- `GET /notification-panel/notifications` (instead of `/api/v1/notifications/user`)
- `GET /notification-panel/admin/notifications` (instead of `/api/v1/notifications/admin`)

All endpoints are already implemented and working in your system!