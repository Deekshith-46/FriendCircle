# API Testing Guide: Important, Favourite, and Top Fans

## Overview
This guide provides detailed step-by-step instructions for testing the Important, Favourite, and Top Fans API endpoints. It covers setup, authentication, test scenarios, and expected responses.

## Prerequisites

### Environment Setup
1. Ensure the server is running on the configured port (typically 3000)
2. Database connection is established and seeded with test data
3. Admin configuration for Top Fans is created and active
4. Test users (male and female) are registered and verified

### Required Tools
- Postman, Insomnia, or curl for API testing
- Test users with different interaction histories
- Admin user for configuration management

## 1. Authentication Setup

### Step 1: Login as Female User
```bash
POST /female/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

Expected Response:
```json
{
  "success": true,
  "token": "your-jwt-token-here",
  "user": {
    "id": "695...",
    "type": "female"
  }
}
```

### Step 2: Set Authorization Header
For all subsequent requests, include:
```
Authorization: Bearer <your-jwt-token>
```

## 2. Favourite Tab API Testing

### 2.1 Add to Favourites

#### Endpoint
```
POST /female/favourites/add-favourites
```

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body
```json
{
  "maleUserId": "695914e8e2955fc569bd70d6"
}
```

#### Step-by-step Test:
1. Login as female user
2. Prepare request with valid male user ID
3. Send POST request
4. Verify success response
5. Check database for record creation

#### Expected Response
```json
{
  "success": true,
  "message": "Male user added to FemaleFavourites."
}
```

#### Error Cases to Test:
- Invalid maleUserId format
- Non-existent maleUserId
- Already added to favourites
- Missing authorization

### 2.2 Remove from Favourites

#### Endpoint
```
DELETE /female/favourites/remove-favourites
```

#### Request Body
```json
{
  "maleUserId": "695914e8e2955fc569bd70d6"
}
```

#### Test Steps:
1. Ensure user is in favourites list
2. Send DELETE request
3. Verify removal from database

### 2.3 Get Favourites List

#### Endpoint
```
GET /female/favourites/list-favourites
```

#### Test Steps:
1. Add some users to favourites
2. Send GET request
3. Verify response format and data

#### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "maleId": "695...",
      "name": "John Doe",
      "profilePic": "https://...",
      "lastMessage": "Hello!",
      "lastMessageAt": "2026-01-12T10:30:00Z"
    }
  ]
}
```

## 3.   

### 3.1 Get Important Chats

#### Endpoint
```
GET /female/chat-tabs/important-chats
```

#### Headers
```
Authorization: Bearer <token>
```

#### Prerequisites for Testing:
1. Female user must have chat rooms with male users
2. Some rooms should have unread messages
3. Some rooms should have unread media
4. Some rooms should have missed calls
5. Some rooms should have no activity

#### Step-by-step Test:

##### Test Case 1: Unread Text Messages
1. Send messages from male user to female
2. Don't mark as read in female's chat room
3. Call Important Chats API
4. Verify chat appears with unreadCount > 0

##### Test Case 2: Unread Media Messages
1. Send image/video/voice from male user
2. Call Important Chats API
3. Verify chat appears with unreadMediaCount > 0 and hasMedia = true

##### Test Case 3: Missed Calls
1. Have male user initiate call that female misses
2. Call Important Chats API
3. Verify chat appears with missedCallCount > 0 and hasMissedCall = true

##### Test Case 4: Priority Sorting
1. Create scenario with missed call, media, and text messages
2. Call Important Chats API
3. Verify order: missed call > media > text

#### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "maleId": "696...",
      "name": "Alex Johnson",
      "profilePic": "https://...",
      "unreadCount": 2,
      "unreadMediaCount": 1,
      "missedCallCount": 0,
      "hasMedia": true,
      "hasMissedCall": false,
      "lastMessage": "Hey there!",
      "lastMessageAt": "2026-01-12T10:15:00Z"
    }
  ]
}
```

#### Performance Tests:
1. Test with 50+ chat rooms
2. Verify response time is under 2 seconds
3. Monitor database query count (should be minimal)

#### Error Cases:
- No chat rooms exist
- Database connectivity issues
- Invalid authorization

## 4. Top Fans Tab API Testing

### 4.1 Prerequisites for Testing
1. Admin must have created and activated TopFanConfig
2. Female user must have interacted with male users
3. Various message types should exist (text, media, calls)
4. CallHistory records should be present

### 4.2 Get Top Fans

#### Endpoint
```
GET /female/chat-tabs/top-fans
```

#### Headers
```
Authorization: Bearer <token>
```

#### Step-by-step Test:

##### Test Case 1: Basic Top Fans Calculation
1. Ensure admin config exists with scoring rules
2. Create various interactions between female and male users
3. Call Top Fans API
4. Verify scores are calculated based on admin config

##### Test Case 2: Different Message Types
1. Send text, image, video, audio messages from male users
2. Send replies from female user
3. Verify different point values applied per admin config

##### Test Case 3: Fast Reply Bonus
1. Send message from male user
2. Send quick reply from female (within 5 minutes)
3. Verify fast reply bonus applied

##### Test Case 4: Call Scoring
1. Complete audio/video calls between users
2. Verify call-based scoring applied
3. Verify only completed calls count

##### Test Case 5: Recency Decay
1. Test with old and recent interactions
2. Verify recency decay affects scores appropriately

#### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "maleId": "696...",
      "name": "Michael Smith",
      "profilePic": "https://...",
      "score": 87,
      "maleEffortScore": 95,
      "femaleResponseScore": 42,
      "multiplier": 0.92,
      "messageCount": 23,
      "lastInteractionAt": "2026-01-12T09:45:00Z"
    }
  ]
}
```

#### Admin Configuration Tests:
1. Test with no active config (should return error)
2. Test with multiple configs (should use active one)
3. Test with invalid config values

#### Anti-Spam Tests:
1. Test with many messages in short time
2. Verify daily caps are applied
3. Test with repeated fast replies
4. Verify stacking prevention works

### 4.3 Admin Top Fan Config API Testing

#### Create Config
```bash
POST /admin/top-fan-config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "maleEffort": {
    "text": 1,
    "image": 3,
    "video": 4,
    "voice": 5,
    "audioCall": 8,
    "videoCall": 10
  },
  "femaleResponse": {
    "textReply": 2,
    "fastReplyBonus": 3,
    "voiceReply": 4,
    "callAnswered": 6
  },
  "multipliers": [
    {
      "min": 0,
      "max": 10,
      "factor": 0.2
    },
    {
      "min": 11,
      "max": 25,
      "factor": 0.5
    },
    {
      "min": 26,
      "max": 1000,
      "factor": 1.0
    }
  ],
  "minTopFanScore": 100,
  "isActive": true
}
```

#### Update Config
```bash
PUT /admin/top-fan-config/{configId}
```

#### Activate Config
```bash
POST /admin/top-fan-config/{configId}/activate
```

## 5. Admin Top Fans Monitoring API Testing

### 5.1 Get Top Fans for Specific Female User

#### Endpoint
```
GET /admin/top-fans/top-fans/{femaleId}
```

#### Headers
```
Authorization: Bearer <admin-token>
```

#### Path Parameter
- `femaleId`: ID of the female user to check

#### Test Steps:
1. Login as admin user
2. Get a valid female user ID
3. Call the endpoint
4. Verify response with detailed scoring

#### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "maleId": "696...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "joinedAt": "2026-01-01T00:00:00Z",
      "score": 87,
      "maleEffortScore": 95,
      "femaleResponseScore": 42,
      "multiplier": 0.92,
      "messageCount": 23,
      "lastInteractionAt": "2026-01-12T09:45:00Z",
      "qualified": true,
      "suspicious": false
    }
  ],
  "femaleUser": {
    "id": "695...",
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "configUsed": {
    "minTopFanScore": 100,
    "maleEffort": {
      "text": 1,
      "image": 2,
      "video": 3,
      "voice": 4,
      "audioCall": 5,
      "videoCall": 6
    },
    "femaleResponse": {
      "textReply": 2,
      "fastReplyBonus": 3,
      "voiceReply": 4,
      "callAnswered": 6
    }
  }
}
```

### 5.2 Get Top Fans Summary

#### Endpoint
```
GET /admin/top-fans/top-fans-summary
```

#### Test Steps:
1. Login as admin user
2. Call the endpoint
3. Verify response with female users list

#### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": "695...",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "joinedAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 150
}
```

## 5. Integration Testing Scenarios

### 5.1 Full User Journey
1. Female user logs in
2. Checks Important tab (should show active conversations)
3. Views Top Fans (should show most engaged males)
4. Adds some users to Favourites
5. Goes back to Important tab (favourites don't affect importance)
6. Interacts with Top Fans
7. Returns to Top Fans (should reflect new interactions

### 5.2 Edge Cases
- User with no chat history
- User with many chat rooms
- Config changes mid-session
- Concurrent API calls
- Large media files in chat history

## 6. Performance Testing

### 6.1 Load Testing
- Test with 100+ concurrent users
- Monitor response times
- Check database connection pooling
- Verify memory usage

### 6.2 Stress Testing
- Max chat rooms per user (500+)
- High message volume scenarios
- Multiple simultaneous API calls
- Database stress with large datasets

## 7. Security Testing

### 7.1 Authorization Tests
- Access without token
- Token expiration
- Wrong user type accessing endpoints
- Cross-user data access attempts

### 7.2 Input Validation
- SQL injection attempts
- XSS payload testing
- Malformed JSON handling
- Invalid ObjectId formats

## 8. Monitoring and Logging

### 8.1 Success Metrics
- API response times
- Success/failure rates
- Database query performance
- User engagement metrics

### 8.2 Error Tracking
- Log all error responses
- Track authentication failures
- Monitor database connection issues
- Record performance degradation

## 9. Test Automation

### 9.1 Automated Test Suite
Create automated tests covering:
- All API endpoints
- Error cases
- Authentication flows
- Data validation
- Response format verification

### 9.2 Continuous Integration
- Run tests on every commit
- Database seeding for test environment
- Mock external services
- Performance benchmarks