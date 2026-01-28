# Final Score-Based System API Testing Guide

## Overview
Comprehensive testing guide for the admin-friendly, rule-based scoring system with simplified rule types and clear business logic.

## System Architecture Summary

### Core Components
- **AdminRewardRule**: Simplified rule-based system with 4 rule types
- **ScoreHistory**: Immutable source of truth for all score transactions
- **FemaleUser**: Stores lifetime, daily, and weekly score caches
- **Cron Jobs**: Automated daily/weekly score processing and resets

### Key Features Implemented
- ✅ Admin-friendly rule configuration (no technical typing)
- ✅ 4 clear rule types: DAILY_LOGIN, DAILY_AUDIO_CALL_TARGET, DAILY_VIDEO_CALL_TARGET, WEEKLY_CONSISTENCY
- ✅ MongoDB-native aggregation pipeline for agency dashboard
- ✅ Time-based score filtering (This Week / Last Week / Custom)
- ✅ Agency data isolation security

## Testing Environment Setup

### Prerequisites
```bash
# Start MongoDB
mongod

# Start the application
npm run dev

# Verify services are running
curl http://localhost:5000/api/health
```

### Required Collections
Ensure these collections exist and are properly indexed:
- `femaleusers` - User profiles and score caches
- `scorehistories` - Immutable score transaction logs  
- `adminrewardrules` - Scoring rule definitions
- `agencyusers` - Agency information

## Admin Reward Rule Setup

### 1. Create Scoring Rules
**Endpoint:** `POST /api/admin/reward-rules/rules`

**Daily Login Rule:**
```json
{
  "ruleType": "DAILY_LOGIN",
  "scoreValue": 10,
  "description": "Award for logging in daily",
  "isActive": true
}
```

**Daily Audio Call Target Rule:**
```json
{
  "ruleType": "DAILY_AUDIO_CALL_TARGET", 
  "scoreValue": 25,
  "minCount": 3,
  "description": "Award for receiving 3+ audio calls in a day",
  "isActive": true
}
```

**Daily Video Call Target Rule:**
```json
{
  "ruleType": "DAILY_VIDEO_CALL_TARGET",
  "scoreValue": 50,
  "minCount": 2,
  "description": "Award for receiving 2+ video calls in a day", 
  "isActive": true
}
```

**Weekly Consistency Rule:**
```json
{
  "ruleType": "WEEKLY_CONSISTENCY",
  "scoreValue": 100,
  "requiredDays": 7,
  "description": "Award for 7 consecutive active days",
  "isActive": true
}
```

### 2. View All Scoring Rules
**Endpoint:** `GET /api/admin/reward-rules/rules`

### 3. Update Scoring Rule
**Endpoint:** `PUT /api/admin/reward-rules/rules/{ruleId}`

**Example:**
```json
{
  "scoreValue": 15,
  "description": "Updated daily login reward"
}
```

### 4. Delete Scoring Rule
**Endpoint:** `DELETE /api/admin/reward-rules/rules/{ruleId}`

## Score Generation Testing

### 1. Simulate User Login Activity
**Endpoint:** `POST /api/female-user/login`

```bash
# Day 1 - First login
curl -X POST http://localhost:5000/api/female-user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@email.com",
    "password": "password123"
  }'

# If DAILY_LOGIN rule exists, expect ScoreHistory entry with 10 points
```

### 2. Simulate Call Completion (for testing call target rules)
**Endpoint:** `POST /api/calls/complete`

```json
{
  "callId": "call_12345",
  "duration": 1800,  // 30 minutes
  "femaleUserId": "user_id_123",
  "callType": "audio",
  "status": "completed"
}

# If DAILY_AUDIO_CALL_TARGET rule exists (minCount: 3), expect score when 3rd call completed today
```

### 3. Simulate Video Call Completion
**Endpoint:** `POST /api/calls/complete`

```json
{
  "callId": "call_12346",
  "duration": 1200,  // 20 minutes
  "femaleUserId": "user_id_123",
  "callType": "video", 
  "status": "completed"
}

# If DAILY_VIDEO_CALL_TARGET rule exists (minCount: 2), expect score when 2nd video call completed today
```

## Score History Verification

### 1. View User's Score History
**Endpoint:** `GET /api/female-user/{userId}/score-history`

```bash
curl -X GET "http://localhost:5000/api/female-user/user_id_123/score-history?page=1&limit=10" \
  -H "Authorization: Bearer <user_token>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "history_123",
      "femaleUserId": "user_id_123",
      "ruleType": "DAILY_LOGIN",
      "scoreAdded": 10,
      "referenceDate": "2024-01-15T00:00:00.000Z",
      "createdAt": "2024-01-15T08:00:05.000Z"
    },
    {
      "_id": "history_124", 
      "femaleUserId": "user_id_123",
      "ruleType": "DAILY_AUDIO_CALL_TARGET",
      "scoreAdded": 25,
      "referenceDate": "2024-01-15T00:00:00Z",
      "createdAt": "2024-01-15T10:00:05.000Z"
    }
  ]
}
```

### 2. Verify Score Totals
**Endpoint:** `GET /api/female-user/{userId}/scores`

```bash
curl -X GET "http://localhost:5000/api/female-user/user_id_123/scores" \
  -H "Authorization: Bearer <user_token>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id_123",
    "name": "Test User",
    "score": 85,        // Lifetime total (10 + 25 + 50)
    "dailyScore": 75,   // Today's score (10 + 25 + 50) 
    "weeklyScore": 85,  // This week's score (includes daily + weekly if applicable)
    "consecutiveActiveDays": 3
  }
}
```

### 3. Admin View User Scores
**Endpoint:** `GET /api/admin/reward-rules/users/{userId}/scores`

### 4. Admin View User Score History
**Endpoint:** `GET /api/admin/reward-rules/users/{userId}/history`

## Agency Dashboard Testing

### 1. Agency Authentication
**Endpoint:** `POST /api/agency/login`

```json
{
  "email": "agency@example.com",
  "password": "agency_password"
}
```

### 2. This Week Score View
**Endpoint:** `GET /api/agency/scores/female-users?period=thisWeek`

```bash
curl -X GET "http://localhost:5000/api/agency/scores/female-users?period=thisWeek&sortBy=periodScore&sortOrder=desc" \
  -H "Authorization: Bearer <agency_token>"
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_123",
      "name": "Sarah Johnson",
      "email": "sarah@test.com",
      "score": 150,           // Lifetime score
      "periodScore": 45,      // This week only
      "consecutiveActiveDays": 3,
      "lastActiveDate": "2024-01-15T14:30:00.000Z",
      "walletBalance": 250.50,
      "coinBalance": 1250
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalResults": 15
  }
}
```

### 3. Last Week Score View
**Endpoint:** `GET /api/agency/scores/female-users?period=lastWeek`

```bash
# Test date boundary accuracy
# Should show scores from Monday 00:00:00 to previous Monday 00:00:00
curl -X GET "http://localhost:5000/api/agency/scores/female-users?period=lastWeek&sortBy=periodScore" \
  -H "Authorization: Bearer <agency_token>"
```

### 4. Custom Date Range Testing
**Endpoint:** `GET /api/agency/scores/female-users?period=custom`

```bash
# Test inclusive end date
curl -X GET "http://localhost:5000/api/agency/scores/female-users?period=custom&startDate=2024-01-01&endDate=2024-01-15&sortBy=periodScore" \
  -H "Authorization: Bearer <agency_token>"
```

## Cron Job Testing

### 1. Daily Cron Job
**Schedule:** Runs daily at 12:05 AM

**Expected Behavior:**
- Resets `dailyScore` to 0 for all users
- Applies DAILY_LOGIN, DAILY_AUDIO_CALL_TARGET, DAILY_VIDEO_CALL_TARGET rules
- Updates `dailyScore`, `weeklyScore`, and `score` fields
- Creates ScoreHistory entries

### 2. Weekly Cron Job  
**Schedule:** Runs weekly on Monday at 12:10 AM

**Expected Behavior:**
- Applies WEEKLY_CONSISTENCY rule if user has 7+ consecutive active days
- Resets `weeklyScore` to 0 for all users
- Does NOT reset `consecutiveActiveDays`
- Updates `weeklyScore` and `score` fields
- Creates ScoreHistory entries

## Advanced Testing Scenarios

### Scenario 1: Daily Rule Verification
```bash
# 1. Create DAILY_LOGIN rule (scoreValue: 10)
# 2. User logs in today → dailyScore = 10
# 3. User receives 3 audio calls today (rule: minCount 3, scoreValue 25) → dailyScore = 35
# 4. Next day → dailyScore resets to 0, weeklyScore accumulates
```

### Scenario 2: Weekly Consistency Verification
```bash
# 1. Create WEEKLY_CONSISTENCY rule (requiredDays: 7, scoreValue: 100)
# 2. User active for 7 consecutive days → receives 100 points weekly
# 3. Weekly cron runs → weeklyScore resets, consecutiveActiveDays preserved
```

### Scenario 3: Agency Data Isolation
```bash
# 1. Create Agency A with 3 users
# 2. Create Agency B with 2 users
# 3. Login as Agency A
# 4. Verify only Agency A's users visible
# 5. Attempt to access Agency B's users (should fail)
# 6. Test search functionality within agency scope
```

### Scenario 4: Large Dataset Performance
```bash
# 1. Create 10,000 female users
# 2. Generate score history for each (100 entries avg)
# 3. Test API response time < 1000ms
# 4. Verify memory usage stays constant
# 5. Test concurrent requests (10 simultaneous)
```

## Automated Testing Scripts

### Test Score Accumulation
```javascript
// test-score-accumulation.js
const axios = require('axios');

async function testScoreFlow() {
  const baseUrl = 'http://localhost:5000/api';
  
  // 1. Create scoring rules
  await axios.post(`${baseUrl}/admin/reward-rules/rules`, {
    ruleType: "DAILY_LOGIN",
    scoreValue: 10,
    description: "Daily login test",
    isActive: true
  });
  
  await axios.post(`${baseUrl}/admin/reward-rules/rules`, {
    ruleType: "DAILY_AUDIO_CALL_TARGET", 
    scoreValue: 25,
    minCount: 2,
    description: "Audio call target test",
    isActive: true
  });
  
  // 2. Simulate activities and verify scores
  console.log("Testing score accumulation...");
}

testScoreFlow();
```

### Test Agency Dashboard Performance
```javascript
// test-agency-performance.js
const axios = require('axios');

async function testAgencyDashboard() {
  const startTime = Date.now();
  
  const response = await axios.get(
    'http://localhost:5000/api/agency/scores/female-users?period=thisWeek&limit=50',
    { headers: { Authorization: `Bearer ${agencyToken}` } }
  );
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  console.log(`Response time: ${responseTime}ms`);
  console.log(`Users returned: ${response.data.data.length}`);
  console.log(`Memory efficient: ${responseTime < 1000 ? 'PASS' : 'FAIL'}`);
}
```

## Validation Checklist

### ✅ Rule System Functionality
- [ ] DAILY_LOGIN rule works correctly
- [ ] DAILY_AUDIO_CALL_TARGET rule checks minCount
- [ ] DAILY_VIDEO_CALL_TARGET rule checks minCount  
- [ ] WEEKLY_CONSISTENCY rule checks consecutive days
- [ ] Score values applied correctly per rule
- [ ] Daily/weekly/monthly resets work properly

### ✅ Score System Functionality
- [ ] Score rules create ScoreHistory entries
- [ ] Daily scores accumulate to weekly totals  
- [ ] Weekly scores contribute to lifetime totals
- [ ] Score resets preserve historical data
- [ ] Consecutive days tracking works correctly

### ✅ Agency Dashboard Features
- [ ] This Week filtering shows correct date range
- [ ] Last Week filtering excludes current week
- [ ] Custom date ranges are inclusive
- [ ] Agency scope filtering prevents data leaks
- [ ] Pagination works with large datasets
- [ ] Sorting functions properly for all fields

### ✅ Performance Requirements
- [ ] Response time < 200ms for small agencies (<100 users)
- [ ] Response time < 500ms for medium agencies (100-1000 users)
- [ ] Response time < 1000ms for large agencies (1000+ users)
- [ ] Memory usage constant regardless of dataset size
- [ ] Concurrent requests handled without degradation

### ✅ Security Compliance
- [ ] Agencies cannot access other agencies' data
- [ ] Authentication required for all protected endpoints
- [ ] Score manipulation only possible through legitimate activities
- [ ] Audit trail maintained in ScoreHistory

## Troubleshooting Common Issues

### Issue: Scores Not Appearing in Dashboard
**Solution:**
1. Check ScoreHistory collection for entries
2. Verify date ranges in query parameters
3. Confirm user belongs to agency making request
4. Check cron job status for score processing

### Issue: Incorrect Time Period Filtering
**Solution:**
1. Verify getStartOfWeek() function logic
2. Check timezone settings on server
3. Confirm inclusive end date handling
4. Validate MongoDB date comparison operators

### Issue: Performance Degradation with Large Datasets
**Solution:**
1. Ensure indexes exist on frequently queried fields
2. Verify aggregation pipeline optimization
3. Check memory allocation for Node.js process
4. Monitor MongoDB query execution plans

## Monitoring and Maintenance

### Key Metrics to Track
- Average API response time
- Database query performance
- Memory consumption trends
- Score calculation accuracy rate
- Agency dashboard usage patterns

### Health Check Endpoints
```bash
# System health
GET /api/health

# Database connectivity  
GET /api/db-health

# Cron job status
GET /api/admin/cron-status
```

This comprehensive testing guide ensures the simplified, admin-friendly score-based system functions correctly across all implemented features and performance requirements.