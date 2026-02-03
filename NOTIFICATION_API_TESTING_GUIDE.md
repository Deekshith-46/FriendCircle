# Notification System API Testing Guide

## Overview
This comprehensive guide provides step-by-step instructions for testing the complete notification system API endpoints. The system handles user registrations, approvals, KYC processing, and withdrawal requests with both admin and user panel support.

## Prerequisites

### Required Tools
- **Postman** or **curl** for API testing
- **MongoDB** database access
- **Node.js** environment
- **Valid authentication tokens** (user, admin, agency)

### Environment Setup
1. Ensure the server is running on `http://localhost:5001`
2. Have valid JWT tokens for different user types:
   - User token (female/male/agency)
   - Admin token
3. FCM tokens for push notification testing

## Testing Categories

### 1. User Panel Notification Testing

#### 1.1 Get User Notifications
**Endpoint:** `GET /api/v1/notifications/user`

**Test Steps:**
1. **Basic Request**
   ```bash
   curl -X GET "http://localhost:5001/api/v1/notifications/user" \
     -H "Authorization: Bearer USER_JWT_TOKEN"
   ```

2. **With Pagination**
   ```bash
   curl -X GET "http://localhost:5001/api/v1/notifications/user?page=1&limit=5" \
     -H "Authorization: Bearer USER_JWT_TOKEN"
   ```

3. **Unread Only**
   ```bash
   curl -X GET "http://localhost:5001/api/v1/notifications/user?unreadOnly=true" \
     -H "Authorization: Bearer USER_JWT_TOKEN"
   ```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "6978a49ddf0e36c658f73f8b",
        "title": "KYC Approved",
        "message": "Your KYC documents have been approved",
        "type": "kyc_approved",
        "priority": "medium",
        "read": false,
        "createdAt": "2024-01-22T10:30:00Z",
        "data": {
          "kycId": "6978a49ddf0e36c658f73f8c"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalNotifications": 45,
      "unreadCount": 3
    }
  }
}
```

#### 1.2 Mark Notification as Read
**Endpoint:** `PUT /api/v1/notifications/{notificationId}/read`

**Test Steps:**
1. **Get a notification ID** from the notifications list
2. **Mark as read:**
   ```bash
   curl -X PUT "http://localhost:5001/api/v1/notifications/NOTIFICATION_ID/read" \
     -H "Authorization: Bearer USER_JWT_TOKEN"
   ```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### 1.3 Mark All Notifications as Read
**Endpoint:** `PUT /api/v1/notifications/read-all`

**Test Steps:**
```bash
curl -X PUT "http://localhost:5001/api/v1/notifications/read-all" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 5
  }
}
```

#### 1.4 Get Unread Count
**Endpoint:** `GET /api/v1/notifications/unread-count`

**Test Steps:**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/unread-count" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

### 2. Admin Panel Notification Testing

#### 2.1 Get Admin Notifications
**Endpoint:** `GET /api/v1/notifications/admin`

**Test Steps:**
1. **Basic Request**
   ```bash
   curl -X GET "http://localhost:5001/api/v1/notifications/admin" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"
   ```

2. **With Filters**
   ```bash
   curl -X GET "http://localhost:5001/api/v1/notifications/admin?unreadOnly=true&type=kyc_submitted" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"
   ```

3. **Pagination**
   ```bash
   curl -X GET "http://localhost:5001/api/v1/notifications/admin?page=1&limit=10" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"
   ```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "6978a49ddf0e36c658f73f8d",
        "title": "New KYC Submission",
        "message": "User john.doe@example.com submitted KYC documents",
        "type": "kyc_submitted",
        "priority": "high",
        "read": false,
        "createdAt": "2024-01-22T10:15:00Z",
        "data": {
          "userId": "6978a49ddf0e36c658f73f8e",
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

#### 2.2 Admin Mark Notification as Read
**Endpoint:** `PUT /api/v1/notifications/admin/{notificationId}/read`

**Test Steps:**
```bash
curl -X PUT "http://localhost:5001/api/v1/notifications/admin/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### 3. FCM Token Management Testing

#### 3.1 Save FCM Token
**Endpoint:** `POST /api/v1/notifications/save-token`

**Test Steps:**
1. **Valid Token Registration**
   ```bash
   curl -X POST "http://localhost:5001/api/v1/notifications/save-token" \
     -H "Authorization: Bearer USER_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "fcm_test_token_12345",
       "deviceId": "test-device-web",
       "platform": "web"
     }'
   ```

2. **Duplicate Token (should fail)**
   ```bash
   curl -X POST "http://localhost:5001/api/v1/notifications/save-token" \
     -H "Authorization: Bearer USER_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "fcm_test_token_12345",
       "deviceId": "test-device-web",
       "platform": "web"
     }'
   ```

3. **Invalid Platform**
   ```bash
   curl -X POST "http://localhost:5001/api/v1/notifications/save-token" \
     -H "Authorization: Bearer USER_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "fcm_test_token_67890",
       "deviceId": "test-device-invalid",
       "platform": "invalid_platform"
     }'
   ```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

**Expected Error Response:**
```json
{
  "success": false,
  "error": "FCM token already registered",
  "message": "This device token is already registered"
}
```

#### 3.2 Remove FCM Token
**Endpoint:** `DELETE /api/v1/notifications/remove-token`

**Test Steps:**
```bash
curl -X DELETE "http://localhost:5001/api/v1/notifications/remove-token" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm_test_token_12345"
  }'
```

### 4. Business Event Testing

#### 4.1 User Registration Flow Testing

**Step 1: Trigger Registration Event**
Test the actual registration process that triggers notifications:
```bash
# Female user registration (triggers account_approval_request)
curl -X POST "http://localhost:5001/female-user/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com",
    "mobileNumber": "9876543210",
    "referralCode": "AGENCY123"
  }'
```

**Step 2: Verify Admin Notification**
Check admin panel for new registration notification:
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/admin?unreadOnly=true&type=account_approval_request" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Step 3: Approve User Registration**
```bash
curl -X POST "http://localhost:5001/admin/users/approve" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_REGISTRATION",
    "userType": "female",
    "status": "accepted"
  }'
```

**Step 4: Verify User Notification**
Check user's notifications for approval confirmation:
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/user" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

#### 4.2 KYC Process Testing

**Step 1: Submit KYC (User Side)**
```bash
curl -X POST "http://localhost:5001/female-user/kyc/submit" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "account_details",
    "accountDetails": {
      "name": "Test User",
      "accountNumber": "1234567890",
      "ifsc": "BANK0001234"
    }
  }'
```

**Step 2: Verify Admin Notification**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/admin?unreadOnly=true&type=kyc_submitted" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Step 3: Approve KYC (Admin Side)**
```bash
curl -X POST "http://localhost:5001/admin/kyc/approve/FEMALE_USER_ID" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Step 4: Verify User Notification**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/user" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

#### 4.3 Withdrawal Process Testing

**Step 1: Request Withdrawal (User Side)**
```bash
curl -X POST "http://localhost:5001/female-user/withdrawal/request" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "method": "bank_transfer"
  }'
```

**Step 2: Verify Admin Notification**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/admin?unreadOnly=true&type=withdrawal_requested" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Step 3: Process Withdrawal (Admin Side)**
```bash
curl -X POST "http://localhost:5001/admin/withdrawals/approve/WITHDRAWAL_ID" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Step 4: Verify User Notification**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/user" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

### 5. Error Handling Testing

#### 5.1 Authentication Errors

**Test Invalid Token:**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/user" \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

#### 5.2 Authorization Errors

**Test User Accessing Admin Endpoint:**
```bash
curl -X GET "http://localhost:5001/api/v1/notifications/admin" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Unauthorized access"
}
```

#### 5.3 Validation Errors

**Test Invalid Notification ID:**
```bash
curl -X PUT "http://localhost:5001/api/v1/notifications/invalid-id/read" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

**Test Invalid FCM Token Data:**
```bash
curl -X POST "http://localhost:5001/api/v1/notifications/save-token" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "",
    "deviceId": "test-device",
    "platform": "web"
  }'
```

### 6. Real-time Notification Testing

#### 6.1 WebSocket Connection Test

**Frontend Test Setup:**
```javascript
// In browser console or test file
const socket = io('http://localhost:5001');

socket.on('connect', () => {
  console.log('Connected to notification service');
});

socket.on('notification:received', (data) => {
  console.log('Real-time notification received:', data);
  // Handle notification display
});
```

#### 6.2 FCM Notification Test

**Trigger notification to test push delivery:**
1. Ensure FCM token is registered
2. Trigger a business event that generates notification
3. Check if browser notification appears

### 7. Performance Testing

#### 7.1 Load Testing Notifications

**Test multiple concurrent requests:**
```bash
# Test concurrent notification fetches
ab -n 100 -c 10 -H "Authorization: Bearer USER_JWT_TOKEN" \
  http://localhost:5001/api/v1/notifications/user
```

#### 7.2 Pagination Performance
```bash
# Test large dataset pagination
curl -X GET "http://localhost:5001/api/v1/notifications/user?page=1&limit=100" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

### 8. Database Validation Testing

#### 8.1 Direct Database Verification

**Check notification records in MongoDB:**
```javascript
// Connect to MongoDB and check notification collection
db.notifications.find({
  "receiverType": "female",
  "receiverId": ObjectId("USER_ID")
}).sort({ createdAt: -1 }).limit(10)
```

**Verify FCM token storage:**
```javascript
db.users.findOne(
  { _id: ObjectId("USER_ID") },
  { fcmTokens: 1 }
)
```

## Testing Checklist

### ✅ Pre-Testing
- [ ] Server is running on correct port
- [ ] Authentication tokens are valid
- [ ] Database connection is active
- [ ] FCM configuration is properly set up

### ✅ Core Functionality
- [ ] User notifications endpoint works
- [ ] Admin notifications endpoint works
- [ ] Pagination functionality
- [ ] Mark as read operations
- [ ] FCM token registration
- [ ] Unread count tracking

### ✅ Business Events
- [ ] Registration notification flow
- [ ] KYC submission/approval notifications
- [ ] Withdrawal request/processing notifications
- [ ] Approval/rejection notifications

### ✅ Error Handling
- [ ] Authentication error handling
- [ ] Authorization validation
- [ ] Input validation errors
- [ ] Database error handling

### ✅ Edge Cases
- [ ] Empty notification lists
- [ ] Duplicate FCM tokens
- [ ] Invalid notification IDs
- [ ] Concurrent access scenarios

### ✅ Real-time Features
- [ ] WebSocket notification delivery
- [ ] FCM push notifications
- [ ] Notification acknowledgment
- [ ] Delivery intent logic

## Troubleshooting Guide

### Common Issues

#### 1. 401 Unauthorized
- **Cause:** Invalid or expired JWT token
- **Solution:** Regenerate authentication tokens

#### 2. 403 Forbidden
- **Cause:** Insufficient permissions
- **Solution:** Check user role and endpoint access rights

#### 3. 404 Not Found
- **Cause:** Invalid endpoint or notification ID
- **Solution:** Verify endpoint path and notification existence

#### 4. 500 Internal Server Error
- **Cause:** Server-side issues or database problems
- **Solution:** Check server logs and database connectivity

#### 5. No Notifications Received
- **Cause:** FCM token not registered or socket connection issues
- **Solution:** 
  - Verify FCM token registration
  - Check browser notification permissions
  - Confirm WebSocket connection status

### Debug Commands

**Check server logs:**
```bash
# Tail server logs for notification-related entries
tail -f server.log | grep -i notification
```

**Database debugging:**
```javascript
// Check notification collection
db.notifications.count()
db.notifications.find().sort({ createdAt: -1 }).limit(5)

// Check user FCM tokens
db.users.find({ fcmTokens: { $exists: true, $ne: [] } }, { email: 1, fcmTokens: 1 })
```

## Test Data Preparation

### Sample User Data
```javascript
// Create test users in database
const testUsers = [
  {
    email: "female.test@example.com",
    mobileNumber: "9876543210",
    userType: "female"
  },
  {
    email: "male.test@example.com", 
    mobileNumber: "9876543211",
    userType: "male"
  },
  {
    email: "agency.test@example.com",
    mobileNumber: "9876543212",
    userType: "agency"
  }
];
```

### Sample Admin Data
```javascript
// Create test admin user
const testAdmin = {
  email: "admin.test@example.com",
  password: "secure_password_123",
  role: "admin"
};
```

This comprehensive testing guide covers all aspects of the notification system API, from basic functionality to advanced real-time features and error handling scenarios.