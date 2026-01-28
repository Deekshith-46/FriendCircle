# Female User Statistics API Routes

This document provides the API routes for testing the female user statistics functionality.

## 1. Toggle Online Status

### Endpoint
```
POST /female-user/toggle-online-status
```

### Headers
```
Authorization: Bearer <female_user_token>
Content-Type: application/json
```

### Request Body
```json
{
  "onlineStatus": true
}
```

### Response
```json
{
  "success": true,
  "message": "Status updated to online",
  "data": {
    "onlineStatus": true,
    "totalOnlineMinutes": 0
  }
}
```

## 2. Get Female User Statistics

### Endpoint
```
GET /female-user/stats
```

### Headers
```
Authorization: Bearer <female_user_token>
```

### Response
```json
{
  "success": true,
  "data": {
    "totalOnlineTime": 45.5,
    "missedCalls": 3,
    "weekEarning": 250,
    "todayEarning": 50,
    "callEarning": 200,
    "giftEarning": 50,
    "otherEarning": 0,
    "walletBalance": 300
  }
}
```

## 3. Get Specific Female User Statistics

### Endpoint
```
GET /female-user/stats/:userId
```

### Headers
```
Authorization: Bearer <admin_or_staff_token>
```

### Response
```json
{
  "success": true,
  "data": {
    "totalOnlineTime": 45.5,
    "missedCalls": 3,
    "weekEarning": 250,
    "todayEarning": 50,
    "callEarning": 200,
    "giftEarning": 50,
    "otherEarning": 0,
    "walletBalance": 300
  }
}
```

## 4. Increment Missed Calls

### Endpoint
```
POST /female-user/increment-missed-calls
```

### Headers
```
Authorization: Bearer <female_user_token>
```

### Response
```json
{
  "success": true,
  "message": "Missed calls incremented",
  "data": {
    "missedCalls": 4
  }
}
```

## 5. Increment Missed Calls for Specific User

### Endpoint
```
POST /female-user/increment-missed-calls/:userId
```

### Headers
```
Authorization: Bearer <admin_or_staff_token>
```

### Response
```json
{
  "success": true,
  "message": "Missed calls incremented",
  "data": {
    "missedCalls": 4
  }
}
```

## 6. Get Received Gifts

### Endpoint
```
GET /female-user/gifts/received
```

### Headers
```
Authorization: Bearer <female_user_token>
```

### Query Parameters
- `limit` (optional): Number of records to return (default: 50)
- `skip` (optional): Number of records to skip (default: 0)

### Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "6933ebb8149b3fba441789db",
      "senderId": {
        "_id": "68d79cd913c8b10d9837a047",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      },
      "receiverId": "6933ebb8149b3fba441789db",
      "giftId": {
        "_id": "68d4f9dfdd3c0ef9b8ebbf19",
        "giftTitle": "Rose Bouquet",
        "imageUrl": "https://example.com/gifts/rose_bouquet.jpg"
      },
      "giftTitle": "Rose Bouquet",
      "coinsSpent": 20,
      "message": "Gift received (Rose Bouquet) from John Doe",
      "date": "2025-12-09T06:17:54.342Z",
      "createdAt": "2025-12-09T06:17:54.342Z",
      "updatedAt": "2025-12-09T06:17:54.342Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

## 7. Get Gift Statistics

### Endpoint
```
GET /female-user/gifts/stats
```

### Headers
```
Authorization: Bearer <female_user_token>
```

### Response
```json
{
  "success": true,
  "data": {
    "totalGifts": 5,
    "totalCoinsReceived": 100
  }
}
```

## 8. Get Call Earnings

### Endpoint
```
GET /female-user/calls/earnings
```

### Headers
```
Authorization: Bearer <female_user_token>
```

### Query Parameters
- `limit` (optional): Number of records to return (default: 50)
- `skip` (optional): Number of records to skip (default: 0)

### Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "6937d09a549023623359acc0",
      "callerId": {
        "_id": "68d79cd913c8b10d9837a047",
        "name": "John Doe",
        "email": "john.doe@example.com"
      },
      "receiverId": "6933ebb8149b3fba441789db",
      "duration": 65,
      "coinsPerSecond": 1,
      "totalCoins": 65,
      "callType": "video",
      "status": "completed",
      "createdAt": "2025-12-09T07:16:40.145Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

## 9. Get Call Earnings Statistics

### Endpoint
```
GET /female-user/calls/earnings-stats
```

### Headers
```
Authorization: Bearer <female_user_token>
```

### Response
```json
{
  "success": true,
  "data": {
    "totalCalls": 3,
    "totalDuration": 195,
    "totalEarnings": 195
  }
}
```