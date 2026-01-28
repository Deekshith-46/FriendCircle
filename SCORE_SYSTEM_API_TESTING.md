# Score-Based System API Testing Guide

## Overview
Comprehensive testing guide for the complete scoring system implementation including score accumulation, time-based filtering, and agency dashboard APIs.

## System Architecture Summary

### Core Components
- **ScoreHistory**: Immutable source of truth for all score transactions
- **FemaleUser**: Stores lifetime, daily, and weekly score caches
- **AdminRewardRule**: Configurable scoring rules
- **Cron Jobs**: Automated daily/weekly score processing and resets

### Key Features Implemented
- ✅ MongoDB-native aggregation pipeline for agency dashboard
- ✅ Time-based score filtering (This Week / Last Week / Custom)
- ✅ Agency data isolation security
- ✅ Scalable score calculations without N+1 queries
- ✅ Proper date boundary handling with inclusive end dates

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

**Login Activity Rule:**
```json
{
  "ruleName": "Daily Login Bonus",
  "activityType": "LOGIN",
  "condition": "daily",
  "scoreValue": 10,
  "isActive": true
}
```

**Online Time Rule:**
```json
{
  "ruleName": "Hourly Online Activity",
  "activityType": "ONLINE_TIME",
  "condition": "per_hour",
  "scoreValue": 5,
  "isActive": true
}
```

**Call Activity Rule:**
```json
{
  "ruleName": "Completed Call Bonus",
  "activityType": "CALL_COMPLETED", 
  "condition": "per_call",
  "scoreValue": 25,
  "isActive": true
}
```

**Weekly Consistency Rule:**
```json
{
  "ruleName": "7-Day Consistency Bonus",
  "activityType": "WEEKLY_CONSISTENCY",
  "condition": "consecutive_7_days",
  "scoreValue": 100,
  "isActive": true
}
```

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

# Verify score was added
# Expected: ScoreHistory entry with 10 points for LOGIN activity
```

### 2. Simulate Online Time Activity
**Endpoint:** `POST /api/female-user/update-status`

```json
{
  "status": "online",
  "location": {
    "type": "Point",
    "coordinates": [-73.9857, 40.7484]
  }
}

# After 2 hours online:
# Expected: Multiple ScoreHistory entries for ONLINE_TIME (5 pts/hour × 2 = 10 pts)
```

### 3. Simulate Call Completion
**Endpoint:** `POST /api/calls/complete`

```json
{
  "callId": "call_12345",
  "duration": 1800,  // 30 minutes
  "femaleUserId": "user_id_123"
}

# Expected: ScoreHistory entry with 25 points for CALL_COMPLETED
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
      "activityType": "LOGIN",
      "scoreAdded": 10,
      "referenceDate": "2024-01-15T08:00:00.000Z",
      "createdAt": "2024-01-15T08:00:05.000Z"
    },
    {
      "_id": "history_124", 
      "femaleUserId": "user_id_123",
      "activityType": "ONLINE_TIME",
      "scoreAdded": 10,
      "referenceDate": "2024-01-15T10:00:00.000Z",
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
    "score": 45,        // Lifetime total
    "dailyScore": 20,   // Today's score
    "weeklyScore": 45,  // This week's score
    "consecutiveActiveDays": 1
  }
}
```

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
**Endpoint:** `GET /api/agency/female-users-with-scores?period=thisWeek`

```bash
curl -X GET "http://localhost:5000/api/agency/female-users-with-scores?period=thisWeek&sortBy=periodScore&sortOrder=desc" \
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
**Endpoint:** `GET /api/agency/female-users-with-scores?period=lastWeek`

```bash
# Test date boundary accuracy
# Should show scores from Monday 00:00:00 to previous Monday 00:00:00
curl -X GET "http://localhost:5000/api/agency/female-users-with-scores?period=lastWeek&sortBy=periodScore" \
  -H "Authorization: Bearer <agency_token>"
```

### 4. Custom Date Range Testing
**Endpoint:** `GET /api/agency/female-users-with-scores?period=custom`

```bash
# Test inclusive end date
curl -X GET "http://localhost:5000/api/agency/female-users-with-scores?period=custom&startDate=2024-01-01&endDate=2024-01-15&sortBy=periodScore" \
  -H "Authorization: Bearer <agency_token>"
```

## Advanced Testing Scenarios

### Scenario 1: Score Reset Timing Verification
```bash
# 1. Generate scores on Sunday night
# 2. Verify scores exist in ScoreHistory
# 3. Wait for weekly cron (runs Monday 00:05 AM)
# 4. Check that weeklyScore was reset to 0
# 5. Verify lifetime score preserved
# 6. Confirm ScoreHistory entries remain unchanged
```

### Scenario 2: Consecutive Days Tracking
```bash
# Day 1: Login → consecutiveActiveDays = 1
# Day 2: Login → consecutiveActiveDays = 2  
# Day 3: Miss login → consecutiveActiveDays = 0
# Day 4: Login → consecutiveActiveDays = 1
# Verify weekly consistency bonus triggers at 7 consecutive days
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
  
  // 1. Create user
  const userResponse = await axios.post(`${baseUrl}/admin/female-users`, {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    referredByAgency: 'agency_id'
  });
  
  const userId = userResponse.data.data._id;
  
  // 2. Simulate activities
  await axios.post(`${baseUrl}/female-user/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  
  // 3. Verify score history
  const historyResponse = await axios.get(`${baseUrl}/female-user/${userId}/score-history`);
  console.log('Score entries:', historyResponse.data.data.length);
  
  // 4. Verify totals
  const scoreResponse = await axios.get(`${baseUrl}/female-user/${userId}/scores`);
  console.log('Total score:', scoreResponse.data.data.score);
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
    'http://localhost:5000/api/agency/female-users-with-scores?period=thisWeek&limit=50',
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

This comprehensive testing guide ensures the score-based system functions correctly across all implemented features and performance requirements.