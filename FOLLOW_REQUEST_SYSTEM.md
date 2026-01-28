# Follow Request System Documentation

## Overview
This document describes the new follow request system that implements Instagram-like functionality where:
1. Only male users can send follow requests to female users
2. Female users can accept or reject follow requests
3. After acceptance, the male user is added to the female user's followers list
4. No automatic follow-back happens - the female user remains not following the male user unless she explicitly follows back

## How It Works

### 1. Male User Sends Follow Request
- Male user sends a follow request to a female user
- The request is stored with "pending" status
- Female user receives notification of the follow request

### 2. Female User Manages Follow Requests
- Female user can view all received follow requests
- Female user can accept or reject each request
- When accepted, only the male user is added to the female user's followers list
- No automatic follow-back occurs

### 3. Follow Back Functionality
- After accepting a follow request, the female user can choose to follow back
- This is done explicitly through the "Follow Back" endpoint
- When the female user follows back, she is added to the male user's following list and he is added to her followers list

### 4. Unfollow Functionality
- Any user can unfollow another user at any time
- Unfollowing removes the target from the user's Following list
- If the target was following back, they remain in the user's Followers list unless also unfollowed
- Action must be reflected immediately in both users' social lists upon refresh

### 5. Following/Followers Lists
- After a male user's follow request is accepted, he appears in the female user's followers list
- After a female user explicitly follows back, she appears in the male user's following list

## API Endpoints

### Male User Endpoints

#### Send Follow Request
```
POST /api/male-user/follow-request/send
Authorization: Bearer {{male_user_token}}
Content-Type: application/json

{
  "femaleUserId": "FEMALE_USER_ID"
}
```

#### Cancel Follow Request
```
POST /api/male-user/follow-request/cancel
Authorization: Bearer {{male_user_token}}
Content-Type: application/json

{
  "femaleUserId": "FEMALE_USER_ID"
}
```

#### Get Sent Follow Requests
```
GET /api/male-user/follow-requests/sent
Authorization: Bearer {{male_user_token}}
```

#### Get Following List
```
GET /api/male-user/following
Authorization: Bearer {{male_user_token}}
```

#### Get Followers List
```
GET /api/male-user/followers
Authorization: Bearer {{male_user_token}}
```

#### Unfollow a User
```
POST /api/male-user/unfollow
Authorization: Bearer {{male_user_token}}
Content-Type: application/json

{
  "femaleUserId": "FEMALE_USER_ID"
}
```

### Female User Endpoints

#### Get Received Follow Requests
```
GET /api/female-user/follow-requests/received
Authorization: Bearer {{female_user_token}}
```

#### Accept a Follow Request
```
POST /api/female-user/follow-requests/accept
Authorization: Bearer {{female_user_token}}
Content-Type: application/json

{
  "maleUserId": "MALE_USER_ID"
}
```

#### Reject a Follow Request
```
POST /api/female-user/follow-requests/reject
Authorization: Bearer {{female_user_token}}
Content-Type: application/json

{
  "maleUserId": "MALE_USER_ID"
}
```

#### Get All Follow Requests (with optional status filter)
```
GET /api/female-user/follow-requests/all[?status=pending|accepted|rejected]
Authorization: Bearer {{female_user_token}}
```

#### Get Followers List
```
GET /api/female-user/followers
Authorization: Bearer {{female_user_token}}
```

#### Get Following List
```
GET /api/female-user/following
Authorization: Bearer {{female_user_token}}
```

#### Follow Back a User
```
POST /api/female-user/follow-back
Authorization: Bearer {{female_user_token}}
Content-Type: application/json

{
  "maleUserId": "MALE_USER_ID"
}
```

#### Unfollow a User
```
POST /api/female-user/unfollow
Authorization: Bearer {{female_user_token}}
Content-Type: application/json

{
  "maleUserId": "MALE_USER_ID"
}
```

## UI Mapping

### Followers Tab (Female View)
Show each follower item with:
- Avatar, username, age, status (online), earnings (if any)
- A CTA: Follow Back OR Following (if already following)
- Optionally: Message, Call icons
- Also show pending requests at top (if you keep them separate)

### Following Tab (Female View)
Shows people she actively follows (separate list).

## Testing with Postman
A Postman collection `Follow_Request_System.postman_collection.json` is included with all the endpoints configured. You can import this collection into Postman to test the functionality.

## Backward Compatibility
The old `/api/female-user/follow` endpoint is maintained for backward compatibility but is deprecated. New implementations should use the follow request system.