# Chat System Flow Explanation

## Overview
This document explains the complete chat system flow between frontend and backend, including all components and interactions.

## System Architecture

```
Frontend (Mobile/Web) <---> Backend Server <---> MongoDB Database
                                    |
                                    v
                            Socket.IO (Real-time)
```

## Components

### 1. Frontend Components
- **Chat List Screen**: Shows all conversations with unread counts
- **Chat Screen**: Individual chat room with message history
- **Message Input**: For sending text, images, videos, etc.
- **Real-time Updates**: Live message receipts and notifications

### 2. Backend Components
- **REST APIs**: For initial setup, history, and static data
- **Socket.IO**: For real-time messaging
- **MongoDB Collections**: 
  - ChatRoom: Stores chat room information
  - Message: Stores individual messages

## Complete Flow

### 1. User Authentication
```
Frontend -> Backend
```
- User logs in and gets JWT token
- Token contains user ID and type (male/female)
- Token used for all subsequent requests

### 2. Follow Request Flow
```
Male User -> Follow Request -> Female User
```
- Male sends follow request to female
- Female accepts/rejects the request
- Status stored in FollowRequest collection

### 3. Block List Integration
```
User A -> Block -> User B
```
- Either user can block the other
- Blocks prevent chat initiation
- Blocks prevent ongoing chats
- Stored in BlockList collection

### 4. Starting Chat Flow
```
Male User -> Backend -> Chat Room Creation
```
1. Male user sends POST `/chat/start` with femaleId
2. Backend checks if follow request is accepted
3. If accepted, creates/returns chat room
4. Generates unique roomKey to prevent duplicates

### 5. Real-time Messaging Flow
```
User -> Socket.IO -> Real-time Delivery
```
1. User connects to Socket.IO server
2. Authenticates using JWT token
3. Joins specific chat room
4. Sends messages via Socket.IO events
5. Other user receives messages in real-time

### 6. Message History Flow
```
User -> Backend -> Database -> User
```
1. User makes GET request for message history
2. Backend fetches messages from MongoDB
3. Filters messages based on user permissions
4. Returns messages to frontend

## Step-by-Step Process

### A. Starting a Chat
1. **Check Eligibility**: Backend verifies follow request is accepted
2. **Create Room**: Creates unique chat room if not exists
3. **Return Room**: Returns room info to frontend

### B. Sending a Message
1. **Validate Message**: Check message type and content
2. **Save to DB**: Store message in MongoDB
3. **Real-time Send**: Emit to other user via Socket.IO
4. **Update Room**: Update last message in chat room

### C. Receiving Messages
1. **Real-time**: Receive via Socket.IO events
2. **History**: Fetch from MongoDB when opening chat
3. **Display**: Show in chronological order

### D. Read Receipts
1. **Mark Read**: User marks specific message as read
2. **Update DB**: Update message's readBy array
3. **Update Room**: Update room's lastReadBy for unread count
4. **Notify Other**: Send read receipt to other user

### E. Deleting Messages
1. **Soft Delete**: Add user ID to isDeletedFor array
2. **Hide from User**: Filter out for specific user
3. **Preserve**: Keep for other user

### F. Disappearing Messages
1. **Enable Feature**: User enables disappearing messages
2. **Audit Trail**: Record who enabled and when
3. **Automatic Cleanup**: Messages auto-delete after set time

## Security Features

### 1. Authentication
- JWT tokens for all requests
- Socket.IO authentication required
- User type validation
- Database user type verification (security hardening)

### 2. Authorization
- Only participants can join rooms
- Only sender can delete for everyone
- Room access validation
- Block list enforcement
- Disappearing messages audit tracking

### 3. Data Integrity
- Unique roomKey prevents duplicates
- Message type validation
- Content validation based on type

## Frontend Responsibilities

### 1. UI/UX Features
- Chat list with unread counts
- Message bubbles with timestamps
- Online/offline indicators
- Typing indicators
- Message status (sent/delivered/read)

### 2. Real-time Handling
- Connect to Socket.IO on app start
- Join rooms when opening chat
- Listen for new messages
- Handle read receipts
- Update UI in real-time

### 3. Offline Support
- Cache recent messages
- Queue outgoing messages
- Sync when connection restored

## Backend Responsibilities

### 1. Data Management
- Store messages in MongoDB
- Maintain chat room relationships
- Handle user permissions
- Manage disappearing messages

### 2. Real-time Communication
- Authenticate Socket.IO connections
- Validate message permissions
- Broadcast messages to correct rooms
- Handle connection management

### 3. Business Logic
- Enforce follow request rules
- Calculate unread counts
- Handle message deletion
- Manage media uploads