/**
 * POSTMAN NOTIFICATION TESTING GUIDE
 * 
 * This file explains how to test notifications using Postman
 */

// 1. Save FCM Token (Essential for receiving notifications)
POST /notification/save-token
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "fcmToken": "test_postman_token_for_notifications",
  "deviceId": "postman_test_device",
  "platform": "web"
}

// Expected Response:
{
  "success": true,
  "message": "FCM token saved successfully"
}

// 2. Verify Token Saved
GET /notification/devices
Authorization: Bearer {{user_token}}

// Expected Response:
{
  "success": true,
  "data": {
    "deviceCount": 1,
    "devices": [
      {
        "deviceId": "postman_test_device",
        "platform": "web",
        "registeredAt": "timestamp"
      }
    ]
  }
}

// 3. Trigger Real Notification Events (These will work now!)

// Example 1: Admin approve user registration
POST /admin/users/review-registration
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "userType": "female",
  "userId": "{{female_user_id}}",
  "reviewStatus": "accepted"
}

// Example 2: Admin approve KYC
POST /admin/users/review-kyc
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "userType": "female",
  "userId": "{{female_user_id}}",
  "kycType": "bank",
  "status": "accepted"
}

// Example 3: User submit KYC
POST /female-user/kyc/submit
Authorization: Bearer {{female_token}}
Content-Type: application/json

{
  "bank": {
    "name": "Test User",
    "accountNumber": "1234567890",
    "ifsc": "ABCD0123456"
  }
}

// 4. Check Notifications
GET /notification-panel/notifications
Authorization: Bearer {{user_token}}

// Expected Response:
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notification_id",
        "title": "Account Approved! 🎉",
        "message": "Your account has been approved...",
        "type": "ACCOUNT_APPROVED",
        "isRead": false,
        "createdAt": "timestamp"
      }
    ],
    "pagination": {...}
  }
}

// 5. Mark Notification as Read
PUT /notification-panel/notifications/{{notification_id}}/read
Authorization: Bearer {{user_token}}

// 6. Test Notification (Development)
POST /notification/test
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "targetUserId": "{{target_user_id}}",
  "targetType": "female",
  "title": "Test Notification",
  "body": "This is a test message",
  "data": {
    "customField": "customValue"
  }
}