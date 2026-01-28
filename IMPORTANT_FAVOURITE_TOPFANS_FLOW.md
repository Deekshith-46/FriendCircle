# Important, Favourite, and Top Fans - Complete Flow Documentation

## Overview
This document describes the complete flow for the three female user chat tabs: Important, Favourite, and Top Fans. Each tab serves a distinct purpose in organizing conversations and interactions for optimal user experience.

## Architecture Overview

```
Female User Chat Inbox
├── Favourite (Manual selection)
├── Important (System priority)
└── Top Fans (Engagement-based ranking)
```

## 1. Favourite Tab

### Purpose
Manual selection of preferred contacts by the female user.

### Data Model
```javascript
FemaleFavourites {
  femaleUserId: ObjectId,
  maleUserId: ObjectId,
  createdAt: Date
}
```

### Flow
1. Female user manually adds/removes male users to favourites
2. API retrieves all favourited male users with profile information
3. Display with user details and last interaction

### API Endpoint
```
GET /female/favourites/list-favourites
```

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "maleId": "...",
      "name": "John Doe",
      "profilePic": "https://...",
      "lastMessage": "...",
      "lastMessageAt": "2026-01-12T10:30:00Z"
    }
  ]
}
```

## 2. Important Tab

### Purpose
System-prioritized conversations requiring immediate attention based on unread activity.

### Design Principle
Focuses on "incoming attention" - messages and activities directed toward the female user.

### Key Features
- Unread messages from male users
- Unread media (images, videos, voice notes)
- Missed calls from male users
- Priority sorting (missed calls > media > text > time)

### Flow

#### Data Preparation
1. Fetch all chat rooms where female user participates
2. Identify male participants in each room
3. Determine last read time for each room

#### Message Processing
1. Batch query all relevant messages from male participants
2. Calculate unread counts per room
3. Identify unread media messages
4. Find most recent message per room

#### Call Processing
1. Query missed calls from male to female
2. Filter calls after last read time
3. Determine if call is more recent than messages

#### Response Assembly
1. Combine message and call data
2. Apply priority sorting algorithm
3. Add user profile information

### API Endpoint
```
GET /female/chat-tabs/important-chats
```

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "maleId": "695...",
      "name": "Alex Johnson",
      "profilePic": "https://...",
      "unreadCount": 3,
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

### Priority Sorting Algorithm
1. **Missed Calls** (highest priority)
2. **Media Messages** (images, videos, voice notes)
3. **Text Messages** (normal priority)
4. **Time-based** (most recent first)

### Performance Optimizations
- Batch queries instead of N+1 loops
- Single aggregation for unread counts
- Pre-loaded user and image data
- Efficient memory processing

## 3. Top Fans Tab

### Purpose
Algorithmically-ranked male users based on engagement and interaction quality.

### Design Principle
"Male effort × Female response × Recency decay" - shows users who put effort in and receive positive responses.

### Key Components

#### 3.1 Admin Configuration
```javascript
TopFanConfig {
  maleEffort: {
    text: Number,
    image: Number,
    video: Number,
    voice: Number,
    audioCall: Number,
    videoCall: Number
  },
  femaleResponse: {
    textReply: Number,
    fastReplyBonus: Number,
    voiceReply: Number,
    callAnswered: Number
  },
  multipliers: [
    {
      min: Number,
      max: Number,
      factor: Number
    }
  ],
  minTopFanScore: Number,
  isActive: Boolean
}
```

#### 3.2 Scoring Algorithm

##### Male Effort Score
Calculated based on messages sent by male users:
- Text: config.maleEffort.text points
- Image: config.maleEffort.image points
- Video: config.maleEffort.video points
- Voice: config.maleEffort.voice points
- Audio Call: config.maleEffort.audioCall points
- Video Call: config.maleEffort.videoCall points

##### Female Response Score
Calculated based on female's responses:
- Text Reply: config.femaleResponse.textReply points
- Fast Reply Bonus: config.femaleResponse.fastReplyBonus points (if reply within 5 minutes)
- Voice Reply: config.femaleResponse.voiceReply points
- Call Answered: config.femaleResponse.callAnswered points

##### Final Score Calculation
```
Final Score = (Male Effort Score × Multiplier) × Recency Decay
```

#### 3.3 Anti-Spam Measures
- Daily effort cap to prevent flooding
- Only completed calls (≥30 seconds) count
- Fast reply bonus limited to once per male message

#### 3.4 Recency Decay
- Reduces score by 50% if no interaction in 30+ days
- Promotes active engagement over stale interactions

### Flow

#### Configuration Loading
1. Fetch active TopFanConfig from database
2. Validate configuration exists
3. Fail gracefully if no config available

#### Message Processing
1. Loop through chat rooms with male participants
2. For each room, process messages chronologically
3. Track last male message timestamp for fast reply logic
4. Apply male effort scoring
5. Apply female response scoring
6. Prevent fast reply bonus stacking

#### Call Processing
1. Query CallHistory records
2. Process only male-initiated, completed calls
3. Apply call-based scoring
4. Ignore female-initiated calls (not response to male effort)

#### Score Calculation
1. Apply anti-spam caps
2. Calculate multipliers based on female response
3. Apply recency decay
4. Filter by minimum score threshold

#### Response Assembly
1. Sort by final score (descending)
2. Limit to top 10 results
3. Add user profile information
4. Return comprehensive results

### API Endpoint
```
GET /female/chat-tabs/top-fans
```

### Response Format
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

## 4. Integration Points

### Authentication
- All endpoints require female user authentication
- User type validation (must be 'female')
- Active and verified status check

### Database Models
- ChatRoom: Stores conversation participants and metadata
- Message: Stores individual messages with type and read status
- CallHistory: Stores call records with status and duration
- FemaleFavourites: Stores manual favourites
- TopFanConfig: Stores dynamic scoring configuration
- MaleUser/FemaleUser: Stores user profiles
- MaleImage/FemaleImage: Stores user images

### Performance Considerations
- Batch loading for related data
- Aggregation queries for efficient counting
- Memory-efficient processing
- Cached configuration for scoring

## 5. Business Logic Rules

### Important Tab
- Only male-to-female messages considered for last message
- Focus on "incoming attention" model
- Activity-based importance (not favourites)
- Priority: missed calls > media > text > time

### Top Fans Tab
- Female-weighted scoring system
- Anti-spam measures prevent gaming
- Recency decay promotes active engagement
- Admin-configurable scoring rules
- Separate effort and response tracking

### Favourite Tab
- Manual user selection
- No algorithmic influence
- Persistent selection
- Simple relationship tracking

## 5. Admin Monitoring Capabilities

### 5.1 Admin Dashboard API
Admins can monitor Top Fans activity through dedicated APIs:

#### Get Top Fans for Specific Female
- Endpoint: `GET /admin/top-fans/top-fans/{femaleId}`
- Purpose: View detailed scoring for a specific female user
- Shows male effort, female response, multipliers, and suspicious activity flags
- Helps identify potential scamming or unfair practices

#### Get Top Fans Summary
- Endpoint: `GET /admin/top-fans/top-fans-summary`
- Purpose: Get list of female users for monitoring
- Allows admins to select which users to investigate

### 5.2 Anti-Scam Features
- Suspicious activity flagging (high male effort)
- Detailed breakdown of scores
- Email and contact information for verification
- Join date tracking to identify new accounts
- Interaction timeline analysis

## 6. Error Handling

### Common Errors
- Missing admin configuration for Top Fans
- Database connectivity issues
- Authentication failures
- Invalid user state

### Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly message"
}
```

## 7. Future Enhancements

### Potential Features
- Favourite influence on Important tab
- WhatsApp-style message display
- Advanced call analytics
- Time-based trending fans
- Customizable scoring rules
- Notification triggers