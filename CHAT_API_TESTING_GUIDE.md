# Chat System API Testing Guide

## Overview
Complete API testing guide from start to finish for the chat system, including all endpoints and their purposes.

## Prerequisites
- Base URL: `http://localhost:5001`
- Authentication: JWT token required for all endpoints
- User accounts (male and female) already registered

## API Endpoints

### 0. Upload Media
**Endpoint**: `POST /chat/upload`
**Purpose**: Uploads media files (images/videos/audio) to be used in chat messages
**Headers**: 
- `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`
**Fields**:
- `file`: [binary file upload - image, video, or audio]
**Success Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../upload/...",
    "type": "image/video/audio",
    "filename": "original_filename",
    "publicId": "cloudinary_public_id"
  }
}
```
**Uses**: 
- Upload media files to cloud storage
- Get URL for use in message content
- Pre-upload media before sending message

**Steps for sending media messages:**
1. Upload media file using this endpoint
2. Use the returned URL in chat message content field

### 1. Get Uploaded Media
**Endpoint**: `GET /chat/uploads`
**Purpose**: Retrieves user's uploaded media files for reuse or auditing
**Headers**: 
- `Authorization: Bearer <token>`

**Success Response**:
```json
[
  {
    "url": "https://res.cloudinary.com/.../upload/...",
    "type": "image/video/audio",
    "filename": "original_filename",
    "createdAt": "timestamp"
  }
]
```

**Uses**: 
- Retrieve previously uploaded media files
- Reuse media in new messages
- Audit user's media uploads
- View media history

### 1. Start Chat
**Endpoint**: `POST /chat/start`
**Purpose**: Initiates a chat between male and female users
**Headers**: 
- `Authorization: Bearer <token>` (male user token)
**Body**:
```json
{
  "femaleId": "<female_user_id>"
}
```
**Success Response**:
```json
{
  "success": true,
  "data": {
    "_id": "<room_id>",
    "participants": [...],
    "roomKey": "<unique_room_key>",
    "lastMessage": null,
    "lastMessageAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```
**Failure Responses**:
- `403`: Follow request not accepted
- `403`: No follow request sent
- `403`: One of the users has blocked the other
- `500`: Server error

### 2. Get Chat Rooms
**Endpoint**: `GET /chat/rooms`
**Purpose**: Retrieves all chat rooms for the authenticated user
**Headers**: 
- `Authorization: Bearer <token>`
**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "<room_id>",
      "participants": [...],
      "lastMessage": "Last message text",
      "lastMessageAt": "timestamp",
      "unreadCount": 3,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```
**Uses**: 
- Display chat list screen
- Show unread message counts
- Show last message preview

### 3. Get Messages
**Endpoint**: `GET /chat/:roomId/messages`
**Purpose**: Retrieves message history for a specific chat room
**Headers**: 
- `Authorization: Bearer <token>`
**Params**: `roomId` (chat room ID)
**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "<message_id>",
      "chatRoomId": "<room_id>",
      "senderId": "<user_id>",
      "senderType": "male/female",
      "type": "text/image/video/audio/emoji",
      "content": "message content or URL",
      "isDeletedForEveryone": false,
      "createdAt": "timestamp",
      "updatedAt": "..."
    }
  ]
}
```
**Uses**: 
- Load message history when opening chat
- Display messages in chronological order
- Filter out deleted messages

### 4. Send Message
**Endpoint**: `POST /chat/send`
**Purpose**: Sends a new message to a chat room
**Headers**: 
- `Authorization: Bearer <token>`

**Content-Type**: `application/json`

**Body**:
```json
{
  "roomId": "<room_id>",
  "type": "text/image/video/audio/emoji",
  "content": "message content or media URL"
}
```

**For text messages:**
- **Type**: `text`
- **Content**: Plain text message

**For media messages:**
- **Type**: `image`, `video`, or `audio`
- **Content**: URL of the uploaded media file (upload media separately first)

**Success Response**:
```json
{
  "success": true,
  "data": {
    "_id": "<message_id>",
    "chatRoomId": "<room_id>",
    "senderId": "<user_id>",
    "senderType": "male/female",
    "type": "text/image/video/audio/emoji",
    "content": "message content or media URL",
    "createdAt": "timestamp"
  }
}
```
**Uses**: 
- Send text messages
- Send media messages (images, videos, audio) using pre-uploaded URLs
- Send emoji reactions
- Trigger real-time delivery via Socket.IO

### 5. Delete Message for Self
**Endpoint**: `DELETE /chat/message/:messageId`
**Purpose**: Deletes a message for the requesting user only
**Headers**: 
- `Authorization: Bearer <token>`
**Params**: `messageId` (message ID)
**Success Response**:
```json
{
  "success": true
}
```
**Uses**: 
- Remove message from user's view
- Preserve message for other user
- Soft delete approach

### 6. Delete Message for Everyone
**Endpoint**: `DELETE /chat/message/:messageId/delete-for-everyone`
**Purpose**: Deletes a message for all participants in the chat
**Headers**: 
- `Authorization: Bearer <token>` (must be sender)
**Params**: `messageId` (message ID)
**Success Response**:
```json
{
  "success": true,
  "message": "Message deleted for everyone"
}
```
**Uses**: 
- Sender removes sensitive content
- Applies to messages sent by the user only
- Other participants see "Message deleted"

### 7. Mark Message as Read
**Endpoint**: `POST /chat/mark-as-read`
**Purpose**: Marks message(s) as read by the user
**Headers**: 
- `Authorization: Bearer <token>`
**Body** (Single Message):
```json
{
  "roomId": "<room_id>",
  "messageId": "<message_id>"
}
```
**Body** (Bulk Read):
```json
{
  "roomId": "<room_id>",
  "messageIds": ["<message_id1>", "<message_id2>", "<message_id3>"]
}
```
**Success Response**:
```json
{
  "success": true,
  "message": "X message(s) marked as read",
  "readMessageIds": ["<message_ids>"]
}
```
**Uses**: 
- Update read receipts
- Update unread count calculation
- Trigger UI updates for read status
- Support bulk marking for WhatsApp-style blue ticks

### 8. Clear Chat Messages
**Endpoint**: `DELETE /chat/room/:roomId/clear`
**Purpose**: Clears all messages for the user in the chat room (keeps chat visible)
**Headers**: 
- `Authorization: Bearer <token>`
**Params**: `roomId` (room ID)
**Success Response**:
```json
{
  "success": true,
  "message": "Chat cleared"
}
```
**Uses**: 
- Remove all messages from user's view
- Keep chat room visible in chat list
- Reset unread count to 0
- Soft delete approach

### 9. Delete Entire Chat
**Endpoint**: `DELETE /chat/room/:roomId`
**Purpose**: Removes the chat from user's chat list
**Headers**: 
- `Authorization: Bearer <token>`
**Params**: `roomId` (room ID)
**Success Response**:
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```
**Uses**: 
- Remove chat from user's view
- Preserve chat for other user
- Soft delete approach

### 9. Toggle Disappearing Messages
**Endpoint**: `POST /chat/:roomId/disappearing`
**Purpose**: Toggles automatic message deletion on/off
**Headers**: 
- `Authorization: Bearer <token>`
**Params**: `roomId` (room ID)

**Enable Request Body**:
```json
{
  "enabled": true,
  "hours": 24
}
```

**Disable Request Body**:
```json
{
  "enabled": false
}
```

**Enable Success Response**:
```json
{
  "success": true,
  "message": "Disappearing messages enabled",
  "data": {
    "_id": "<room_id>",
    "isDisappearing": true,
    "disappearingAfterHours": 24,
    "disappearingEnabledBy": {
      "userId": "<user_id>",
      "userType": "male/female",
      "enabledAt": "timestamp"
    }
  }
}
```

**Disable Success Response**:
```json
{
  "success": true,
  "message": "Disappearing messages disabled",
  "data": {
    "_id": "<room_id>",
    "isDisappearing": false,
    "disappearingAfterHours": null,
    "disappearingEnabledBy": null
  }
}
```

**Uses**: 
- Enable/disable auto-delete feature
- Set message expiration time when enabling
- Track who enabled (audit trail)
- Trigger MongoDB TTL cleanup when enabled
- Remove TTL when disabled

## Socket.IO Events

### 1. Authenticate
**Event**: `authenticate`
**Purpose**: Authenticate Socket.IO connection
**Data**: JWT token
**Response**: Authentication confirmation
**Uses**: Secure real-time communication

### 2. Join Room
**Event**: `joinRoom`
**Purpose**: Join a specific chat room for real-time updates
**Data**: `roomId`
**Uses**: Receive real-time messages for specific room

### 3. Send Message
**Event**: `sendMessage`
**Purpose**: Send message in real-time
**Data**:
```json
{
  "roomId": "<room_id>",
  "type": "text/image/video/audio/emoji",
  "content": "message content"
}
```
**Uses**: Real-time message delivery

### 4. New Message
**Event**: `newMessage`
**Purpose**: Receive new message from other user
**Data**: Message object
**Uses**: Display new messages instantly

### 5. Mark As Read
**Event**: `markAsRead`
**Purpose**: Mark message as read in real-time
**Data**:
```json
{
  "roomId": "<room_id>",
  "messageId": "<message_id>"
}
```
**Uses**: Real-time read receipt updates

### 6. Message Read
**Event**: `messageRead`
**Purpose**: Receive notification that message was read
**Data**: Read status information
**Uses**: Update message read status in real-time

## Complete Test Flow

### Test Scenario: Complete Chat Experience

1. **Setup Phase**
   - Register male and female users
   - Login and get JWT tokens
   - Male sends follow request to female
   - Female accepts follow request

2. **Start Chat**
   - Male user calls `POST /chat/start`
   - Verify room creation with correct participants
   - Check roomKey uniqueness

3. **Send Messages**
   - Send text message via `POST /chat/send`
   - Send image message (validate URL format)
   - Send multiple messages to test ordering

4. **Receive Messages**
   - Call `GET /chat/:roomId/messages`
   - Verify message order (chronological)
   - Check content filtering

5. **Real-time Features**
   - Connect Socket.IO clients
   - Join chat rooms
   - Send messages and verify real-time delivery
   - Test read receipts

6. **Read Receipts**
   - Send message from user A
   - Mark as read from user B
   - Verify read status updates
   - Check unread count calculation

7. **Message Deletion**
   - Delete message for self (`DELETE /chat/message/:messageId`)
   - Verify message hidden for deleting user
   - Verify message still visible for other user
   - Delete message for everyone (sender only)

8. **Chat Management**
   - Clear chat messages (`DELETE /chat/room/:roomId/clear`)
   - Verify messages removed from user's view, chat room still visible
   - Verify unread count reset to 0
   - Delete entire chat (`DELETE /chat/room/:roomId`)
   - Verify chat removed from user's list
   - Check other user still has chat

9. **Disappearing Messages**
   - Enable disappearing messages (`POST /chat/:roomId/disappearing` with `enabled: true`)
   - Send new messages and verify expiration dates
   - Test TTL cleanup (requires time delay)
   - Disable disappearing messages (`POST /chat/:roomId/disappearing` with `enabled: false`)
   - Verify new messages are not set to expire

10. **Security Tests**
   - Try accessing other user's rooms (should fail)
   - Try deleting other user's messages (should fail)
   - Try sending without authentication (should fail)
   - Try spoofing user type in JWT (should be verified against database)

## Expected Behaviors

### Business Rules Enforcement
- Only accepted follow requests allow chatting
- Only room participants can send messages
- Only message sender can delete for everyone
- Unread counts calculated correctly
- Block list enforcement prevents chatting between blocked users

### Data Validation
- Message types restricted to allowed values
- Content validated based on message type
- URLs validated for media messages
- User permissions enforced

### Performance
- Fast message retrieval
- Real-time delivery under 1 second
- Efficient unread count calculation
- Minimal database queries

## Error Handling
- Proper error codes (400, 403, 404, 500)
- Descriptive error messages
- Graceful degradation
- Consistent response formats