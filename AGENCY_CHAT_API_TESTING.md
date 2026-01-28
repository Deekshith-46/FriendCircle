# Agency Chat System API Testing Guide

## Overview
This document provides a comprehensive step-by-step guide for testing the Agency-Female User chat system using the existing common chat APIs. Agencies can only communicate with female users they have referred, and the system includes full messaging, block list, and unread count features.

## Prerequisites
- Base URL: `http://localhost:5001`
- Authentication: JWT token required for all endpoints
- Registered agency user account
- Female users referred by the agency
- Postman or similar API testing tool

## Important Note
Agencies should use the existing common chat APIs located at `/chat/*` endpoints. The system automatically validates that agencies can only chat with users they have referred.

## API Endpoints

### 1. Get All Chat Rooms
**Endpoint**: `GET /chat/rooms`
**Purpose**: Get list of all chat rooms for the agency with latest message and unread count
**Headers**: 
- `Authorization: Bearer <agency_token>`

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "678901234567890123456792",
      "femaleUser": {
        "_id": "678901234567890123456789",
        "name": "Alice Smith",
        "profileImage": "https://res.cloudinary.com/.../image.jpg",
        "onlineStatus": true
      },
      "lastMessage": "Hello! How are you?",
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "unreadCount": 2,
      "createdAt": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

**Uses**: 
- Display chat list in agency dashboard
- Show unread message counts
- Display last message preview
- Show online status of female users

**Test Steps**:
1. Have at least one referred female user
2. Send a few messages to create a chat room
3. Call this endpoint to get the chat room list
4. Verify the response includes female user details and message info
5. Check that chat rooms are sorted by last message time

### 2. Start Chat with Referred User
**Endpoint**: `POST /chat/start`
**Purpose**: Create a chat room with a referred female user
**Headers**: 
- `Authorization: Bearer <agency_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "femaleId": "678901234567890123456789"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "_id": "678901234567890123456792",
    "participants": [
      {
        "userId": "678901234567890123456789",
        "userType": "female"
      },
      {
        "userId": "678901234567890123456793",
        "userType": "agency"
      }
    ],
    "isDisappearing": false,
    "lastMessage": null,
    "lastMessageAt": null,
    "roomKey": "678901234567890123456789_678901234567890123456793",
    "unreadCount": 0,
    "unreadMap": {},
    "lastReadMap": {},
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Uses**: 
- Create a chat room with a referred female user
- Initialize communication channel
- Get room details for display purposes

**Test Steps**:
1. Get the ID of a referred female user
2. Call this endpoint with the female user ID
3. Verify the response includes both participants
4. Try calling again with the same user ID (should return existing room)
5. Test with a non-referred user (should fail with NOT_REFERRED_USER error)

### 3. Get Referred Female Users List
**Endpoint**: `GET /agency/chat/referred-users`
**Purpose**: Get list of all female users referred by the agency
**Note**: This is the only agency-specific endpoint needed for chat functionality
**Headers**: 
- `Authorization: Bearer <agency_token>`

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "678901234567890123456789",
      "name": "Alice Smith",
      "profileImage": "https://res.cloudinary.com/.../image.jpg",
      "onlineStatus": true
    },
    {
      "_id": "678901234567890123456790",
      "name": "Jane Doe",
      "profileImage": "https://res.cloudinary.com/.../image2.jpg",
      "onlineStatus": false
    }
  ]
}
```

**Uses**: 
- View all referred female users
- See their online status
- Get their profile images for chat list display

**Test Steps**:
1. Register and verify an agency account
2. Refer at least one female user to the agency
3. Complete the female user's profile and get accepted
4. Call this endpoint with agency token
5. Verify the response contains the referred users

### 4. Send Message to Referred Female User
**Endpoint**: `POST /chat/send`
**Purpose**: Send a message to a referred female user
**Headers**: 
- `Authorization: Bearer <agency_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "roomId": "678901234567890123456789",
  "type": "text",
  "content": "Hello Alice! How are you doing today?",
  "mediaMetadata": null
}
```

**For Media Messages**:
```json
{
  "receiverId": "678901234567890123456789",
  "type": "image",
  "content": "https://res.cloudinary.com/.../image.jpg",
  "mediaMetadata": {
    "thumbnail": "https://res.cloudinary.com/.../thumb.jpg",
    "width": 1080,
    "height": 1920,
    "fileSize": 2048000,
    "mimeType": "image/jpeg"
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "_id": "678901234567890123456791",
    "chatRoomId": "678901234567890123456792",
    "senderId": "678901234567890123456793",
    "senderType": "agency",
    "type": "text",
    "content": "Hello Alice! How are you doing today?",
    "isMedia": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "readBy": []
  }
}
```

**Uses**: 
- Send text messages to referred users
- Send media messages (images, videos, audio)
- Track message delivery and read status

**Test Steps**:
1. Get the `_id` of a referred female user from step 1
2. Send a text message to the user
3. Verify the response includes `senderType: "agency"`
4. Test sending a message to a non-referred user (should fail)
5. Test sending a message with invalid `receiverId`
6. Test sending a media message with proper metadata

### 5. Get Chat History
**Endpoint**: `GET /chat/:roomId/messages`
**Purpose**: Get chat history with a specific referred female user
**Headers**: 
- `Authorization: Bearer <agency_token>`

**Query Parameters**:
- `receiverId`: ID of the female user (required)
- `limit`: Number of messages to fetch (default: 50)
- `skip`: Number of messages to skip (default: 0)

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "678901234567890123456791",
      "chatRoomId": "678901234567890123456792",
      "senderId": "678901234567890123456793",
      "senderType": "agency",
      "type": "text",
      "content": "Hello Alice! How are you doing today?",
      "isMedia": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "readBy": [
        {
          "userId": "678901234567890123456789",
          "userType": "female",
          "readAt": "2024-01-15T10:30:05.000Z"
        }
      ]
    },
    {
      "_id": "678901234567890123456794",
      "chatRoomId": "678901234567890123456792",
      "senderId": "678901234567890123456789",
      "senderType": "female",
      "type": "text",
      "content": "Hi! I'm doing great, thanks for asking!",
      "isMedia": false,
      "createdAt": "2024-01-15T10:30:05.000Z",
      "readBy": [
        {
          "userId": "678901234567890123456793",
          "userType": "agency",
          "readAt": "2024-01-15T10:30:10.000Z"
        }
      ]
    }
  ]
}
```

**Uses**: 
- Load chat history for display in chat interface
- Show read receipts for messages
- Paginate through older messages

**Test Steps**:
1. Send a few messages to a referred user
2. Have the female user send some replies
3. Call this endpoint with the receiverId
4. Verify messages are sorted by creation time (oldest first)
5. Test with different limit and skip values
6. Test with invalid receiverId (should fail)
7. Test with non-referred user's ID (should fail)

### 6. Mark Messages as Read
**Endpoint**: `POST /chat/mark-as-read`
**Purpose**: Mark messages from a female user as read
**Headers**: 
- `Authorization: Bearer <agency_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "receiverId": "678901234567890123456789",
  "messageIds": [
    "678901234567890123456794",
    "678901234567890123456795"
  ]
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

**Uses**: 
- Update read status for messages
- Reset unread count for the chat
- Provide visual feedback to users

**Test Steps**:
1. Have a female user send a few messages
2. Get the message IDs from the chat history
3. Call this endpoint with the message IDs
4. Verify the messages now show up in the `readBy` array
5. Test with invalid message IDs
6. Test with messages from a different chat room

### 7. Get Unread Count
**Endpoint**: `GET /chat/rooms`
**Purpose**: Get unread count from the chat rooms response
**Note**: Unread counts are included in the `/chat/rooms` response
**Headers**: 
- `Authorization: Bearer <agency_token>`

**Query Parameters**:
- `receiverId`: ID of the female user (required)

**Success Response**:
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

**Uses**: 
- Display badge count in chat list
- Notify user of new messages
- Update UI in real-time

**Test Steps**:
1. Have a female user send a few messages
2. Call this endpoint to get the unread count
3. Mark some messages as read
4. Call the endpoint again to verify the count decreased
5. Test with invalid receiverId
6. Test with non-referred user's ID

### 8. Block a Referred Female User
**Endpoint**: `POST /agency/block-list/block`
**Purpose**: Block a referred female user from sending messages
**Note**: This agency-specific endpoint is still needed for block list functionality
**Headers**: 
- `Authorization: Bearer <agency_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "femaleUserId": "678901234567890123456789"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "_id": "678901234567890123456796",
    "agencyUserId": "678901234567890123456793",
    "blockedUserId": "678901234567890123456789",
    "blockedAt": "2024-01-15T10:45:00.000Z"
  }
}
```

**Uses**: 
- Prevent unwanted communication
- Maintain user safety and comfort
- Comply with user blocking requirements

**Test Steps**:
1. Get the ID of a referred female user
2. Call this endpoint to block the user
3. Try to send a message to the blocked user (should fail)
4. Try to block the same user again (should return error)
5. Test with a non-referred user's ID (should fail)
6. Test with invalid user ID

### 9. Unblock a Female User
**Endpoint**: `POST /agency/block-list/unblock`
**Purpose**: Unblock a previously blocked female user
**Note**: This agency-specific endpoint is still needed for block list functionality
**Headers**: 
- `Authorization: Bearer <agency_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "femaleUserId": "678901234567890123456789"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "User unblocked successfully"
}
```

**Uses**: 
- Restore communication with a user
- Allow messaging after reconsideration
- Manage user relationships

**Test Steps**:
1. Block a female user using the previous endpoint
2. Call this endpoint to unblock the user
3. Verify you can now send messages to the user
4. Try to unblock a user who isn't blocked (should return error)
5. Test with invalid user ID

### 10. Get Block List
**Endpoint**: `GET /agency/block-list/block-list`
**Purpose**: Get list of all blocked female users
**Note**: This agency-specific endpoint is still needed for block list functionality
**Headers**: 
- `Authorization: Bearer <agency_token>`

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "678901234567890123456789",
      "name": "Alice Smith",
      "profileImage": "https://res.cloudinary.com/.../image.jpg",
      "blockedAt": "2024-01-15T10:45:00.000Z"
    }
  ]
}
```

**Uses**: 
- Display blocked users in settings
- Allow user management
- Provide unblock functionality

**Test Steps**:
1. Block a few female users
2. Call this endpoint to get the block list
3. Verify the response includes user details and block timestamp
4. Unblock one user
5. Call the endpoint again to verify the user is removed from the list

## Error Handling

### Common Error Responses

**Unauthorized Access (401)**:
```json
{
  "success": false,
  "message": "Authentication required."
}
```

**User Not Found (404)**:
```json
{
  "success": false,
  "message": "Female user not found"
}
```

**Blocked User Interaction (403)**:
```json
{
  "success": false,
  "message": "Blocked users cannot send messages to each other."
}
```

**Invalid Receiver (403)**:
```json
{
  "success": false,
  "message": "Agency can only chat with users they have referred"
}
```

**Missing Required Fields (400)**:
```json
{
  "success": false,
  "message": "Receiver ID is required"
}
```

## Test Scenarios

### Scenario 1: Complete Chat Flow
1. Agency registers and gets verified
2. Female user registers using agency's referral code
3. Female user completes profile and gets accepted
4. Agency sends a welcome message
5. Female user replies
6. Agency marks messages as read
7. Both users check unread counts
8. Agency blocks the user
9. Verify messages can't be sent
10. Agency unblocks the user
11. Communication resumes

### Scenario 2: Media Messaging
1. Upload media file using common upload endpoint
2. Send media message with proper metadata
3. Verify media displays correctly in chat history
4. Test different media types (image, video, audio)

### Scenario 3: Block List Management
1. Block multiple users
2. Verify block list shows all blocked users
3. Try to send messages to blocked users (should fail)
4. Unblock users one by one
5. Verify unblocked users can receive messages

## Best Practices for Testing

1. **Always test with valid JWT tokens** - Ensure authentication is working
2. **Test with both referred and non-referred users** - Verify access restrictions
3. **Test edge cases** - Empty messages, invalid IDs, large media files
4. **Test concurrent access** - Multiple messages sent rapidly
5. **Test error conditions** - Network failures, server errors
6. **Verify data consistency** - Messages appear in both sender and receiver history
7. **Test real-time features** - Message delivery, read receipts, online status

## Notes
- All timestamps are in ISO 8601 format
- Message IDs are MongoDB ObjectIDs
- Media URLs should be valid and accessible
- Block list operations are immediate and affect all future communications
- Unread counts are automatically updated when new messages arrive