# Chat Features and API Documentation

## Overview

The Friend Circle platform includes a sophisticated real-time chat system with advanced features including WhatsApp-style functionality, privacy controls, and multimedia support.

## Key Features

### 1. Real-time Messaging
- WebSocket-based real-time message delivery
- Support for text, image, video, and audio messages
- Online status indicators
- Delivery confirmations

### 2. Privacy Controls
- **Clear Chat**: Remove all messages for user while keeping chat visible
- **Delete Chat**: Hide entire chat from user's list (soft delete)
- **Individual Message Deletion**: Delete specific messages
- **Delete for Everyone**: Sender-only feature to remove messages for all participants

### 3. Read Receipts
- Individual message read status
- Bulk mark-as-read functionality
- WhatsApp-style blue ticks for read messages
- Unread message counting

### 4. Media Support
- Cloudinary integration for image/video hosting
- Support for images, videos, and audio files
- Thumbnail generation for videos
- File size and type validation

### 5. Advanced Features
- Disappearing messages with configurable time limits
- Group chat management
- Message search and filtering
- Conversation archiving

## API Endpoints

### Authentication
All chat API endpoints require authentication using a Bearer token in the Authorization header.

### 1. Start Chat
**Endpoint**: `POST /chat/start`
**Purpose**: Initiates a chat between two users after validating mutual follow status.

**Request Body**:
```json
{
  "otherUserId": "user_id_to_chat_with"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "_id": "room_id",
    "participants": [...],
    "roomKey": "unique_room_key",
    "lastMessage": null,
    "lastMessageAt": null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

**Error Responses**:
- `403`: Follow request not accepted
- `403`: No follow request sent
- `403`: One of the users has blocked the other
- `500`: Server error

### 2. Get Chat Rooms
**Endpoint**: `GET /chat/rooms`
**Purpose**: Retrieves all chat rooms for the authenticated user.

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "room_id",
      "participants": [...],
      "lastMessage": "Last message text",
      "lastMessageAt": "timestamp",
      "unreadCount": 3,
      "isDeletedFor": ["user_id_if_deleted"],
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### 3. Get Messages
**Endpoint**: `GET /chat/:roomId/messages`
**Purpose**: Retrieves message history for a specific chat room.

**Parameters**: `roomId` (chat room ID)

**Success Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "message_id",
      "chatRoomId": "room_id",
      "senderId": "user_id",
      "senderType": "male/female",
      "type": "text/image/video/audio/emoji",
      "content": "message content or URL",
      "isDeletedFor": ["user_ids"],
      "isDeletedForEveryone": false,
      "readBy": [
        {
          "userId": "user_id",
          "userType": "male/female",
          "readAt": "timestamp"
        }
      ],
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### 4. Send Message
**Endpoint**: `POST /chat/send`
**Purpose**: Sends a new message to a chat room.

**Request Body**:
```json
{
  "roomId": "room_id",
  "type": "text/image/video/audio/emoji",
  "content": "message content or media URL"
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "_id": "message_id",
    "chatRoomId": "room_id",
    "senderId": "user_id",
    "senderType": "male/female",
    "type": "text/image/video/audio/emoji",
    "content": "message content or media URL",
    "createdAt": "timestamp"
  }
}
```

### 5. Delete Message for Self
**Endpoint**: `DELETE /chat/message/:messageId`
**Purpose**: Deletes a message for the requesting user only.

**Parameters**: `messageId` (message ID)

**Success Response**:
```json
{
  "success": true
}
```

### 6. Delete Message for Everyone
**Endpoint**: `DELETE /chat/message/:messageId/delete-for-everyone`
**Purpose**: Deletes a message for all participants in the chat (sender only).

**Parameters**: `messageId` (message ID)

**Success Response**:
```json
{
  "success": true,
  "message": "Message deleted for everyone"
}
```

### 7. Mark Message(s) as Read
**Endpoint**: `POST /chat/mark-as-read`
**Purpose**: Marks message(s) as read by the user.

**Single Message Request**:
```json
{
  "roomId": "room_id",
  "messageId": "message_id"
}
```

**Bulk Read Request**:
```json
{
  "roomId": "room_id",
  "messageIds": ["message_id1", "message_id2", "message_id3"]
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "X message(s) marked as read",
  "readMessageIds": ["message_ids"]
}
```

### 8. Clear Chat Messages
**Endpoint**: `DELETE /chat/room/:roomId/clear`
**Purpose**: Clears all messages for the user in the chat room (keeps chat visible).

**Parameters**: `roomId` (room ID)

**Success Response**:
```json
{
  "success": true,
  "message": "Chat cleared"
}
```

### 9. Delete Entire Chat
**Endpoint**: `DELETE /chat/room/:roomId`
**Purpose**: Removes the chat from user's chat list.

**Parameters**: `roomId` (room ID)

**Success Response**:
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

### 10. Toggle Disappearing Messages
**Endpoint**: `POST /chat/:roomId/disappearing`
**Purpose**: Toggles automatic message deletion on/off.

**Parameters**: `roomId` (room ID)

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
    "_id": "room_id",
    "isDisappearing": true,
    "disappearingAfterHours": 24,
    "disappearingEnabledBy": {
      "userId": "user_id",
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
    "_id": "room_id",
    "isDisappearing": false,
    "disappearingAfterHours": null,
    "disappearingEnabledBy": null
  }
}
```

### 11. Upload Media
**Endpoint**: `POST /chat/upload`
**Purpose**: Uploads media files to Cloudinary.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data**:
- `file`: Binary file upload (image, video, or audio)

**Success Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../upload/...",
    "type": "image/video/audio",
    "filename": "original_filename",
    "publicId": "cloudinary_public_id",
    "metadata": {
      "thumbnail": "thumbnail_url",
      "duration": 120,
      "width": 1920,
      "height": 1080,
      "fileSize": 1024000,
      "mimeType": "image/jpeg"
    }
  }
}
```

### 12. Get Uploaded Media
**Endpoint**: `GET /chat/uploads`
**Purpose**: Retrieves user's uploaded media files for reuse or auditing.

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

## Business Rules

### 1. Follow Validation
- Chat initiation requires accepted follow requests between users
- Block list enforcement prevents chatting between blocked users
- Only participants can access chat room content

### 2. Message Deletion
- Users can delete their own messages for themselves
- Senders can delete messages for everyone
- Non-senders cannot delete messages for others
- Deleted messages show "Message deleted" to other users

### 3. Privacy Controls
- Clear Chat: Removes messages but keeps chat room visible
- Delete Chat: Hides entire chat from user's list
- Both are soft deletes - content preserved for other users
- Chats revive when new messages arrive after deletion

### 4. Read Receipts
- Messages marked as read when user accesses them
- Bulk read functionality for WhatsApp-style blue ticks
- Unread counts calculated based on last read timestamp
- Real-time updates via Socket.IO

## Security Features

### 1. Authentication & Authorization
- JWT-based authentication required for all endpoints
- Route-based user type detection
- Database verification of user type against JWT claims
- Participant validation for all chat operations

### 2. Data Validation
- Message type validation (text, image, video, audio, emoji)
- Content validation based on message type
- URL validation for media messages
- Room access validation

### 3. Rate Limiting
- Protection against message spamming
- Upload rate limiting
- API request throttling

## Real-time Features

### Socket.IO Events

#### 1. authenticate
**Purpose**: Authenticate Socket.IO connection
**Data**: JWT token

#### 2. joinRoom
**Purpose**: Join a specific chat room for real-time updates
**Data**: `roomId`

#### 3. sendMessage
**Purpose**: Send message in real-time
**Data**:
```json
{
  "roomId": "room_id",
  "type": "text/image/video/audio/emoji",
  "content": "message content"
}
```

#### 4. newMessage
**Purpose**: Receive new message from other user
**Data**: Message object

#### 5. markAsRead
**Purpose**: Mark message as read in real-time
**Data**:
```json
{
  "roomId": "room_id",
  "messageIds": ["message_ids"]
}
```

#### 6. messageRead
**Purpose**: Receive notification that message was read
**Data**: Read status information

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (production mode)"
}
```

### Common Error Codes
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Testing Guidelines

### 1. Happy Path Testing
- Valid authentication and authorization
- Successful message sending and receiving
- Proper read receipt handling
- Correct deletion behavior

### 2. Edge Case Testing
- Invalid user permissions
- Non-existent resources
- Malformed requests
- Concurrent operations

### 3. Security Testing
- Authentication bypass attempts
- Authorization checks
- Data validation
- Rate limiting effectiveness

## Performance Considerations

- Efficient database queries with proper indexing
- Pagination for message history
- Optimized media upload/download
- Real-time connection management
- Memory usage for Socket.IO