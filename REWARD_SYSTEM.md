# Reward System Documentation

## Overview

The reward system calculates daily and weekly rewards for female users. Rewards are calculated automatically but require admin approval before being credited to the user's wallet.

## Reward Types

1. **Daily Rewards** - Based on user's wallet balance
2. **Weekly Rewards** - Based on weekly rankings

## Models

### DailyReward
Defines wallet balance thresholds and corresponding reward amounts for daily rewards.

Fields:
- `minWalletBalance`: Minimum wallet balance threshold
- `rewardAmount`: Reward amount for this threshold

### WeeklyReward
Defines rank-based rewards for weekly earnings.

Fields:
- `rank`: Ranking position (1st, 2nd, etc.)
- `rewardAmount`: Reward amount for this rank

### PendingReward
Stores calculated rewards awaiting admin approval.

Fields:
- `userId`: Reference to FemaleUser
- `type`: 'daily' or 'weekly'
- `earningValue`: Actual wallet balance or earnings value
- `rewardAmount`: Calculated reward amount
- `status`: 'pending', 'approved', or 'rejected'

### RewardHistory
Stores approved/rejected rewards for audit and user history.

Fields:
- `userId`: Reference to FemaleUser
- `type`: 'daily' or 'weekly'
- `rewardAmount`: Reward amount
- `status`: 'approved' or 'rejected'
- `adminId`: Admin who processed the reward
- `note`: Additional notes
- `date`: Date of processing

## Admin Endpoints

### Daily Rewards Management
- `POST /admin/rewards/daily-rewards` - Create daily reward threshold
- `GET /admin/rewards/daily-rewards` - List daily reward thresholds
- `PUT /admin/rewards/daily-rewards/:id` - Update daily reward threshold (partial updates allowed)
- `DELETE /admin/rewards/daily-rewards/:id` - Delete daily reward threshold

### Weekly Rewards Management
- `POST /admin/rewards/weekly-rewards` - Create weekly reward
- `GET /admin/rewards/weekly-rewards` - List weekly rewards
- `PUT /admin/rewards/weekly-rewards/:id` - Update weekly reward (partial updates allowed)
- `DELETE /admin/rewards/weekly-rewards/:id` - Delete weekly reward

### Pending Rewards
- `GET /admin/rewards/pending-rewards` - List pending rewards
- `POST /admin/rewards/pending-rewards/:id/approve` - Approve pending reward
- `POST /admin/rewards/pending-rewards/:id/reject` - Reject pending reward

### Reward History
- `GET /admin/rewards/reward-history` - View reward history

### Manual Triggers
- `POST /admin/rewards/trigger-daily` - Manually calculate daily rewards
- `POST /admin/rewards/trigger-weekly` - Manually calculate weekly rewards

## Female User Endpoints

### Reward History
- `GET /female-user/rewards/history` - View personal reward history

## How It Works

### Daily Rewards
1. Admin defines wallet balance thresholds and reward amounts in DailyReward table
2. System checks each female user's wallet balance
3. System matches wallet balance to reward threshold and creates PendingReward
4. Admin reviews and approves/rejects pending rewards
5. Approved rewards are credited to user's wallet

### Weekly Rewards
1. Admin defines rank-based rewards in WeeklyReward table
2. System calculates weekly earnings for all female users
3. System ranks users by earnings and assigns rewards by rank
4. System creates PendingReward for each eligible user
5. Admin reviews and approves/rejects pending rewards
6. Approved rewards are credited to user's wallet

## Security & Safety

- All reward processing requires admin authentication
- Each reward is tracked with admin ID and timestamps
- Idempotent operations prevent double-processing
- Unique constraints prevent duplicate pending rewards
- Validation prevents duplicate rank assignments
- Partial updates supported for flexible administration

## API Testing Guide

### Prerequisites
1. Valid admin authentication token
2. Valid female user accounts with earnings
3. Running API server

### Step 1: Configure Daily Reward Thresholds

#### Create Daily Reward Thresholds
Endpoint: `POST /admin/rewards/daily-rewards`

Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request Body:
```json
{
  "minWalletBalance": 20000,
  "rewardAmount": 1000
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Daily reward created successfully",
  "data": {
    "_id": "reward_id",
    "minWalletBalance": 20000,
    "rewardAmount": 1000,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

Create additional thresholds:
- Wallet balance 50000 → 2000 reward
- Wallet balance 100000 → 5000 reward

#### Verify Daily Reward Thresholds
Endpoint: `GET /admin/rewards/daily-rewards`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "reward_id_1",
      "minWalletBalance": 20000,
      "rewardAmount": 1000
    },
    {
      "_id": "reward_id_2",
      "minWalletBalance": 50000,
      "rewardAmount": 2000
    },
    {
      "_id": "reward_id_3",
      "minWalletBalance": 100000,
      "rewardAmount": 5000
    }
  ]
}
```

#### Update Daily Reward Threshold (Partial Update)
Endpoint: `PUT /admin/rewards/daily-rewards/{reward_id}`

Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request Body (updating only minWalletBalance):
```json
{
  "minWalletBalance": 25000
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Daily reward updated successfully",
  "data": {
    "_id": "reward_id",
    "minWalletBalance": 25000,
    "rewardAmount": 1000,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

Request Body (updating only rewardAmount):
```json
{
  "rewardAmount": 1500
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Daily reward updated successfully",
  "data": {
    "_id": "reward_id",
    "minWalletBalance": 25000,
    "rewardAmount": 1500,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

#### Delete Daily Reward Threshold
Endpoint: `DELETE /admin/rewards/daily-rewards/{reward_id}`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "message": "Daily reward deleted successfully"
}
```

### Step 2: Configure Weekly Reward Ranks

#### Create Weekly Rewards
Endpoint: `POST /admin/rewards/weekly-rewards`

Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request Body (for rank 1):
```json
{
  "rank": 1,
  "rewardAmount": 50000
}
```

Try to create duplicate rank (should fail):
```json
{
  "rank": 1,
  "rewardAmount": 30000
}
```

Expected Error Response:
```json
{
  "success": false,
  "message": "A reward with this rank already exists"
}
```

Create additional ranks:
- Rank 2 → 25000 reward
- Rank 3 → 10000 reward

#### Verify Weekly Rewards
Endpoint: `GET /admin/rewards/weekly-rewards`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "weekly_reward_id_1",
      "rank": 1,
      "rewardAmount": 50000
    },
    {
      "_id": "weekly_reward_id_2",
      "rank": 2,
      "rewardAmount": 25000
    },
    {
      "_id": "weekly_reward_id_3",
      "rank": 3,
      "rewardAmount": 10000
    }
  ]
}
```

#### Update Weekly Reward (Partial Update)
Endpoint: `PUT /admin/rewards/weekly-rewards/{weekly_reward_id}`

Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request Body (updating only rewardAmount):
```json
{
  "rewardAmount": 60000
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Weekly reward updated successfully",
  "data": {
    "_id": "weekly_reward_id",
    "rank": 1,
    "rewardAmount": 60000,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

Request Body (updating only rank):
```json
{
  "rank": 4
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Weekly reward updated successfully",
  "data": {
    "_id": "weekly_reward_id",
    "rank": 4,
    "rewardAmount": 60000,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

Try to update with duplicate rank (should fail):
```json
{
  "rank": 2
}
```

Expected Error Response:
```json
{
  "success": false,
  "message": "A reward with this rank already exists"
}
```

#### Delete Weekly Reward
Endpoint: `DELETE /admin/rewards/weekly-rewards/{weekly_reward_id}`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "message": "Weekly reward deleted successfully"
}
```

### Step 3: Generate Sample Earnings for Female Users

To test the reward system, female users need to have earnings from calls or gifts. You can either:

1. Make actual calls/gifts through the app
2. Manually add transactions to the database
3. Use existing users with earnings

### Step 4: Trigger Daily Reward Calculation

Endpoint: `POST /admin/rewards/trigger-daily`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "message": "Daily rewards calculation completed"
}
```

### Step 5: Check Pending Daily Rewards

Endpoint: `GET /admin/rewards/pending-rewards?type=daily`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "pending_reward_id",
      "userId": {
        "_id": "user_id",
        "name": "User Name",
        "email": "user@example.com"
      },
      "type": "daily",
      "earningValue": 75000,
      "rewardAmount": 2000,
      "status": "pending",
      "createdAt": "timestamp"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

### Step 6: Approve Pending Reward

Endpoint: `POST /admin/rewards/pending-rewards/{pending_reward_id}/approve`

Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request Body:
```json
{
  "note": "Approved daily reward for user"
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Reward approved successfully",
  "data": {
    "_id": "pending_reward_id",
    "userId": "user_id",
    "type": "daily",
    "earningValue": 75000,
    "rewardAmount": 2000,
    "status": "approved",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### Step 7: Verify Reward History

Endpoint: `GET /admin/rewards/reward-history`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "reward_history_id",
      "userId": {
        "_id": "user_id",
        "name": "User Name",
        "email": "user@example.com"
      },
      "type": "daily",
      "rewardAmount": 2000,
      "status": "approved",
      "adminId": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "note": "Approved daily reward for user",
      "date": "timestamp"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

### Step 8: Check User Wallet Balance

To verify the reward was credited, check the user's wallet balance through the existing user profile endpoint or database.

### Step 9: Test Rejection Workflow

To test rejection:

1. Trigger daily rewards again (ensure user qualifies for another reward)
2. Get pending rewards
3. Reject a pending reward:

Endpoint: `POST /admin/rewards/pending-rewards/{pending_reward_id}/reject`

Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request Body:
```json
{
  "note": "Rejected for testing purposes"
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Reward rejected successfully",
  "data": {
    "_id": "pending_reward_id",
    "userId": "user_id",
    "type": "daily",
    "earningValue": 75000,
    "rewardAmount": 2000,
    "status": "rejected",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### Step 10: Verify Rejection in History

Endpoint: `GET /admin/rewards/reward-history?status=rejected`

Headers:
```
Authorization: Bearer <admin_token>
```

Should show the rejected reward in the response.

### Step 11: Test Weekly Rewards

#### Trigger Weekly Reward Calculation
Endpoint: `POST /admin/rewards/trigger-weekly`

Headers:
```
Authorization: Bearer <admin_token>
```

Expected Response:
```json
{
  "success": true,
  "message": "Weekly rewards calculation completed"
}
```

#### Check Pending Weekly Rewards
Endpoint: `GET /admin/rewards/pending-rewards?type=weekly`

Headers:
```
Authorization: Bearer <admin_token>
```

Should show pending weekly rewards based on user rankings.

### Step 12: Female User Reward History

Endpoint: `GET /female-user/rewards/history`

Headers:
```
Authorization: Bearer <female_user_token>
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "reward_history_id",
      "userId": "user_id",
      "type": "daily",
      "rewardAmount": 2000,
      "status": "approved",
      "adminId": "admin_id",
      "note": "Approved daily reward for user",
      "date": "timestamp"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

## Error Handling

Common error responses:

1. **Unauthorized Access** (401):
```json
{
  "success": false,
  "message": "Not authorized"
}
```

2. **Forbidden Access** (403):
```json
{
  "success": false,
  "message": "Access denied"
}
```

3. **Resource Not Found** (404):
```json
{
  "success": false,
  "message": "Resource not found"
}
```

4. **Validation Error** (400):
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["Error details"]
}
```

5. **Server Error** (500):
```json
{
  "success": false,
  "message": "Internal server error"
}
```