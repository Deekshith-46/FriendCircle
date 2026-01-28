# Daily and Weekly Reward System Setup Guide

This document explains how the Daily and Weekly Reward System works in the Friend Circle application.

## Table of Contents
1. [Overview](#overview)
2. [Daily Reward System](#daily-reward-system)
3. [Weekly Reward System](#weekly-reward-system)
4. [Database Models](#database-models)
5. [Reward Calculation Process](#reward-calculation-process)
6. [Admin API Endpoints](#admin-api-endpoints)
7. [How to Set Up](#how-to-set-up)

## Overview

The reward system provides automated incentives for active female users based on their wallet balance (for daily rewards) and weekly activity rankings (for weekly rewards). The system uses an approval workflow where rewards are calculated and queued for admin approval before being distributed to users.

## Daily Reward System

### How it works:
1. Admins define reward slabs based on minimum wallet balance thresholds
2. System calculates daily rewards for active female users whose wallet balance meets the threshold
3. Rewards are added to pending queue for admin approval
4. Admins approve or reject pending rewards
5. Approved rewards are credited to user's wallet

### Configuration:
- Admin sets minimum wallet balance required (e.g., 1000 coins)
- Admin sets reward amount for each balance threshold
- Users with wallet balance >= threshold qualify for reward
- Only active and accepted female users are eligible

### Process:
1. System scans all active female users
2. Checks each user's current wallet balance against reward thresholds
3. Creates pending reward entry if user qualifies
4. Admin reviews and approves/rejects pending rewards
5. Approved rewards update user's wallet balance

## Weekly Reward System

### How it works:
1. System tracks weekly earnings for active female users
2. Users are ranked based on their weekly earning performance
3. Admins define reward amounts for each rank position
4. Top earners receive higher rewards based on their rank
5. Rewards are processed through admin approval workflow

### Configuration:
- Admin defines reward amounts for rank positions (1st, 2nd, 3rd, etc.)
- System calculates weekly earnings from transactions
- Users ranked by total weekly earnings
- Higher earners receive better rewards based on rank

### Process:
1. System calculates weekly earnings for each active female user
2. Sorts users by earnings (highest to lowest)
3. Assigns rank to each user based on position
4. Matches user's rank to admin-defined reward amounts
5. Creates pending reward entries for admin review
6. Admin approves/rejects rewards which are then credited

## Database Models

### DailyReward Model
- `minWalletBalance`: Minimum wallet balance required to qualify for this reward
- `rewardAmount`: Amount of reward given to qualifying users

### WeeklyReward Model
- `rank`: Rank position (1st, 2nd, 3rd, etc.)
- `rewardAmount`: Amount of reward for users achieving this rank

### PendingReward Model
- Stores calculated rewards pending admin approval
- Links to user who qualifies for the reward
- Contains reward type (daily/weekly) and amount
- Tracks approval status (pending/approved/rejected)

### RewardHistory Model
- Records all approved and rejected reward actions
- Contains user reference, reward type, amount, and status
- Tracks admin who processed the reward
- Stores notes about the reward decision

## Reward Calculation Process

### Daily Reward Calculation
1. System gets all active and accepted female users
2. Gets all daily reward configurations sorted by minimum balance (highest first)
3. For each user:
   - Checks if they already have a pending daily reward for today
   - Compares user's wallet balance against reward thresholds
   - Creates pending reward for highest applicable threshold
4. Admin must approve pending rewards before they're credited

### Weekly Reward Calculation
1. System determines current week (Monday to Sunday)
2. Checks if rewards were already calculated for this week
3. Gets all active and accepted female users
4. Calculates weekly earnings for each user from transaction records
5. Sorts users by earnings (highest first)
6. Assigns ranks based on position
7. Matches each user's rank to admin-defined reward amounts
8. Creates pending reward entries for admin approval

### Manual Trigger
- Admins can manually trigger calculations using API endpoints
- Useful for testing or special reward cycles
- Command line: `node src/jobs/rewardJob.js --daily` or `--weekly`

## Admin API Endpoints

### Daily Reward Management:
- `POST /admin/daily-rewards` - Create new daily reward slab
- `GET /admin/daily-rewards` - Get all daily reward slabs
- `PUT /admin/daily-rewards/:id` - Update daily reward slab
- `DELETE /admin/daily-rewards/:id` - Delete daily reward slab

### Weekly Reward Management:
- `POST /admin/weekly-rewards` - Create new weekly reward rank
- `GET /admin/weekly-rewards` - Get all weekly reward ranks
- `PUT /admin/weekly-rewards/:id` - Update weekly reward rank
- `DELETE /admin/weekly-rewards/:id` - Delete weekly reward rank

### Pending Rewards:
- `GET /admin/pending-rewards` - Get all pending rewards (filter by type)
- `POST /admin/pending-rewards/:id/approve` - Approve a pending reward
- `POST /admin/pending-rewards/:id/reject` - Reject a pending reward

### Reward History:
- `GET /admin/reward-history` - Get reward approval/rejection history

### Manual Triggers:
- `POST /admin/trigger-daily` - Manually run daily reward calculation
- `POST /admin/trigger-weekly` - Manually run weekly reward calculation

## How to Set Up

### 1. Admin Configuration
First, admin needs to set up reward slabs:

Daily Rewards:
```javascript
{
  "minWalletBalance": 1000,
  "rewardAmount": 100
}
```

Weekly Rewards:
```javascript
{
  "rank": 1,
  "rewardAmount": 1000
}
{
  "rank": 2,
  "rewardAmount": 750
}
{
  "rank": 3,
  "rewardAmount": 500
}
```

### 2. Automated Scheduling
Set up cron jobs to automatically run reward calculations:

Daily (runs every day):
- Schedule daily reward calculation
- System will automatically create pending rewards for qualifying users

Weekly (runs once per week):
- Schedule weekly reward calculation
- System will rank users and create pending rewards

### 3. Admin Review Process
- Admin regularly checks pending rewards
- Reviews and approves qualifying rewards
- Rejects invalid or suspicious reward requests
- Monitors reward history for anomalies

### 4. Monitoring
- Track reward distribution statistics
- Monitor user wallet balances
- Review reward approval rates
- Analyze weekly earning patterns

## Best Practices

### Security:
- All reward changes require admin approval
- Wallet balances are validated before issuing rewards
- Transaction records are maintained for all reward credits
- User eligibility is verified (active, accepted status)

### Performance:
- Reward calculations are batch processed
- Database queries are optimized
- Pagination is used for large result sets
- Duplicate reward prevention mechanisms

### Maintenance:
- Regular review of reward configurations
- Monitor system performance during calculation
- Update reward amounts based on platform economics
- Review and adjust eligibility criteria as needed

---

This reward system incentivizes user engagement while maintaining administrative control and security through the approval workflow.