# Complete Level-Based Call Rate System - API Testing Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [New API Endpoints Documentation](#new-api-endpoints-documentation)
4. [Detailed API Testing](#detailed-api-testing)
5. [Test Scenarios](#test-scenarios)
6. [Integration Testing](#integration-testing)
7. [Edge Cases Testing](#edge-cases-testing)
8. [Performance Testing](#performance-testing)
9. [Security Testing](#security-testing)
10. [Postman Collection Examples](#postman-collection-examples)

## Introduction

This document provides comprehensive API testing for the level-based call rate system. The system implements fixed pricing per level with per-second billing, minimum billable duration, and level-based platform margins. This replaces the previous range-based system with a more robust and fair monetization approach.

## System Architecture

### New Architecture Components
- **AdminLevelConfig**: Stores level-based pricing and margins
- **CallSession**: Rate freezing mechanism during active calls
- **CallHistory**: Billing records with per-second accuracy
- **Weekly Level Assignment Job**: Automated level assignment

### Key Improvements Over Previous System
- Fixed rates per level (no user choice)
- Per-second billing with minimum duration
- Rate consistency during calls
- Atomic balance operations
- Session-based rate protection

## New API Endpoints Documentation

### 1. Female User Level APIs

#### GET `/female-user/level-info`
**Authentication**: Female User JWT Required

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "data": {
    "currentLevel": 3,
    "weeklyEarnings": 3500,
    "audioRate": 120,
    "videoRate": 180,
    "fixedAudioRate": 120,
    "fixedVideoRate": 180,
    "levelConfig": {
      "weeklyEarningsMin": 3001,
      "weeklyEarningsMax": 4000,
      "platformMargin": {
        "nonAgency": 35,
        "agency": 45
      }
    }
  }
}
```

#### GET `/female-user/call-rate-settings`
**Authentication**: Female User JWT Required

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "data": {
    "currentLevel": 3,
    "weeklyEarnings": 3500,
    "audioCoinsPerMinute": 120,
    "videoCoinsPerMinute": 180,
    "currentLevelConfig": {
      "level": 3,
      "audioRatePerMinute": 120,
      "videoRatePerMinute": 180,
      "platformMarginPerMinute": {
        "nonAgency": 35,
        "agency": 45
      }
    },
    "allLevels": [...]
  }
}
```

#### PATCH `/female-user/call-rates`
**Authentication**: Female User JWT Required

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{}
```

**Response**:
```json
{
  "success": true,
  "message": "Call rates synchronized with level configuration",
  "data": {
    "currentLevel": 3,
    "audioCoinsPerMinute": 120,
    "videoCoinsPerMinute": 180
  }
}
```

### 2. Call APIs (Updated with New Logic)

#### POST `/male-user/calls/start`
**Purpose**: Start a call with per-second billing calculation and minimum duration validation

**Authentication**: Male User JWT Required

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "receiverId": "female_user_id",
  "callType": "audio" // or "video"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Call can start",
  "data": {
    "callId": "call_12345_67890_1704567890",
    "maxSeconds": 120,
    "femaleRatePerSecond": 2.0,
    "platformRatePerSecond": 0.58,
    "malePayPerSecond": 2.58,
    "callerCoinBalance": 310,
    "isAgencyFemale": false,
    "receiverLevel": 3,
    "levelConfig": {
      "audioRatePerMinute": 120,
      "videoRatePerMinute": 180,
      "platformMarginPerMinute": 35
    }
  }
}
```

**Validation Logic**:
1. Check if caller has minimum required balance for 30-second call
2. Validate female user exists and has proper level
3. Create CallSession with frozen rates
4. Prevent multiple concurrent sessions per user

#### POST `/male-user/calls/end`
**Purpose**: End a call and process per-second billing with minimum duration enforcement

**Authentication**: Male User JWT Required

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "receiverId": "female_user_id",
  "duration": 45, // actual duration in seconds
  "callType": "audio",
  "callId": "call_12345_67890_1704567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "callId": "call_history_id",
    "duration": 45,
    "billableDuration": 45, // or 30 if duration < 30
    "femaleEarningPerSecond": 2.0,
    "platformMarginPerSecond": 0.58,
    "totalCoins": 116,
    "coinsDeducted": 116,
    "femaleEarning": 90,
    "platformMargin": 26,
    "callerRemainingBalance": 194,
    "receiverNewBalance": 2500
  }
}
```

**Billing Logic**:
1. Use frozen rates from CallSession
2. Apply minimum billable duration (30 seconds)
3. Calculate amounts with single rounding point
4. Perform atomic balance updates
5. Mark CallSession as inactive

### 3. Admin APIs for Level Configuration

#### GET `/admin/level-configs`
**Purpose**: Get all level configurations

**Authentication**: Admin JWT Required

#### POST `/admin/level-configs`
**Purpose**: Create/update level configuration

**Authentication**: Admin JWT Required

**Request Body**:
```json
{
  "level": 1,
  "weeklyEarningsMin": 0,
  "weeklyEarningsMax": 1000,
  "audioRatePerMinute": 60,
  "videoRatePerMinute": 90,
  "platformMarginPerMinute": {
    "nonAgency": 20,
    "agency": 30
  },
  "isActive": true
}
```

## Detailed API Testing

### Test 1: Call Start API Testing

#### Test Case 1.1: Valid Call Start
**Scenario**: Male user with sufficient balance starts call with level 3 female

**Preconditions**:
- Male user has 310 coins
- Female user level 3 has audio rate 120/min
- Platform margin 35/min for non-agency
- No existing active session

**Steps**:
1. Send POST request to `/male-user/calls/start`
2. Include receiverId and callType
3. Verify response

**Expected Results**:
- Status: 200 OK
- Response includes callId
- femaleRatePerSecond = 2.0 (120/60)
- platformRatePerSecond = 0.58 (35/60)
- malePayPerSecond = 2.58
- maxSeconds calculated correctly
- CallSession created in database

**Curl Command**:
```bash
curl -X POST "http://localhost:5000/male-user/calls/start" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "<female_user_id>",
    "callType": "audio"
  }'
```

#### Test Case 1.2: Insufficient Balance for Minimum Duration
**Scenario**: Male user tries to start call with insufficient balance for minimum 30-second call

**Preconditions**:
- Male user has 50 coins
- Required minimum for 30-second call is 77.4 coins
- Female user has valid level config

**Steps**:
1. Send POST request to `/male-user/calls/start`
2. Verify error response

**Expected Results**:
- Status: 400 Bad Request
- Error message about insufficient balance
- No CallSession created
- No coins deducted

**Curl Command**:
```bash
curl -X POST "http://localhost:5000/male-user/calls/start" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "<female_user_id>",
    "callType": "audio"
  }'
```

#### Test Case 1.3: Multiple Concurrent Sessions Prevention
**Scenario**: Male user tries to start second call while first is active

**Preconditions**:
- Male user has active call session
- Valid female user exists

**Steps**:
1. Send POST request to `/male-user/calls/start`
2. Verify error response

**Expected Results**:
- Status: 400 Bad Request
- Error message: "You already have an active call session"
- No new CallSession created

### Test 2: Call End API Testing

#### Test Case 2.1: Normal Call End with Duration > 30s
**Scenario**: Male user ends call after 45 seconds

**Preconditions**:
- Active CallSession exists
- Male user has sufficient balance
- Valid callId provided

**Steps**:
1. Send POST request to `/male-user/calls/end`
2. Include duration, receiverId, callType, and callId
3. Verify response and database updates

**Expected Results**:
- Status: 200 OK
- billableDuration = 45 (same as actual)
- totalCoins = 45 * 2.58 = 116 (rounded down)
- femaleEarning = 45 * 2.0 = 90
- platformMargin = 26
- Male balance decreased by 116
- Female wallet increased by 90
- CallSession marked inactive
- CallHistory record created

**Curl Command**:
```bash
curl -X POST "http://localhost:5000/male-user/calls/end" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "<female_user_id>",
    "duration": 45,
    "callType": "audio",
    "callId": "call_session_id"
  }'
```

#### Test Case 2.2: Call End with Duration < 30s (Minimum Applied)
**Scenario**: Male user ends call after 20 seconds (minimum 30s applied)

**Preconditions**:
- Active CallSession exists
- Male user has sufficient balance
- Valid callId provided

**Steps**:
1. Send POST request to `/male-user/calls/end`
2. Include duration of 20 seconds
3. Verify billing uses 30 seconds minimum

**Expected Results**:
- Status: 200 OK
- billableDuration = 30 (minimum applied)
- totalCoins = 30 * 2.58 = 77 (rounded down)
- femaleEarning = 30 * 2.0 = 60
- platformMargin = 17
- Male balance decreased by 77
- Female wallet increased by 60
- CallSession marked inactive

#### Test Case 2.3: Insufficient Balance at End
**Scenario**: Male user's balance changed during call

**Preconditions**:
- Active CallSession exists
- Male user's balance reduced during call
- Insufficient balance for billable duration

**Steps**:
1. Send POST request to `/male-user/calls/end`
2. Verify failed call handling

**Expected Results**:
- Status: 400 Bad Request
- Error message: "Insufficient balance or balance changed. Please retry."
- CallSession marked inactive
- No coins deducted
- CallHistory record created with status 'insufficient_coins'

### Test 3: Level Information API Testing

#### Test Case 3.1: Get Level Information
**Scenario**: Female user retrieves their level information

**Preconditions**:
- Valid female user JWT
- User has level 3 with proper rates

**Steps**:
1. Send GET request to `/female-user/level-info`
2. Verify response data

**Expected Results**:
- Status: 200 OK
- Returns current level, weekly earnings, and rate information
- Includes fixed rate from level config

#### Test Case 3.2: Get Level Settings
**Scenario**: Female user retrieves detailed settings

**Preconditions**:
- Valid female user JWT
- User has level configuration

**Steps**:
1. Send GET request to `/female-user/call-rate-settings`
2. Verify detailed response

**Expected Results**:
- Status: 200 OK
- Returns detailed level configuration
- Includes all levels information

## Test Scenarios

### Scenario 1: Complete Call Flow
1. Male user starts call with sufficient balance
2. Call proceeds for 50 seconds
3. Male user ends call
4. Billing processed correctly
5. All balances updated
6. Call history recorded

### Scenario 2: Minimum Duration Enforcement
1. Male user starts call
2. Call ends after 15 seconds
3. System bills for 30 seconds minimum
4. Fair billing applied

### Scenario 3: Rate Consistency During Call
1. Admin changes level config
2. Active call continues with original rates
3. New calls use updated rates
4. No mid-call rate changes

### Scenario 4: Concurrent Call Prevention
1. Male user starts first call
2. Attempts second call simultaneously
3. Second call rejected
4. First call unaffected

## Integration Testing

### Test 1: Database Integration
**Verify**:
- CallSession created on call start
- CallSession updated on call end
- CallHistory record created
- User balances updated atomically
- TTL index works for cleanup

### Test 2: Authentication Integration
**Verify**:
- JWT tokens validated properly
- Unauthorized access blocked
- User roles enforced correctly

### Test 3: Balance Validation
**Verify**:
- Balance checks work in real-time
- Atomic operations prevent race conditions
- Negative balances prevented

## Edge Cases Testing

### Edge Case 1: Zero Duration Call
**Scenario**: Duration = 0

**Expected**: 400 error with "Call did not connect. No charges applied."

### Edge Case 2: Negative Duration
**Scenario**: Duration < 0

**Expected**: 400 error with "Duration cannot be negative"

### Edge Case 3: Very High Duration
**Scenario**: Duration > 3600 seconds (1 hour)

**Expected**: Proper billing calculation, no overflow

### Edge Case 4: Maximum Balance
**Scenario**: User with very high coin balance

**Expected**: Proper calculations, no integer overflow

### Edge Case 5: Session Expiration
**Scenario**: Call session TTL expires

**Expected**: Session automatically cleaned up, client receives error

## Performance Testing

### Test 1: Call Start Performance
**Goal**: < 200ms response time
**Method**: Load test with concurrent requests
**Expected**: Consistent performance under load

### Test 2: Call End Performance
**Goal**: < 300ms response time
**Method**: Load test with concurrent end requests
**Expected**: Atomic operations complete quickly

### Test 3: Database Performance
**Goal**: Efficient queries with proper indexing
**Method**: Monitor query execution times
**Expected**: Indexed queries perform well

## Security Testing

### Test 1: Authentication Bypass
**Scenario**: Attempt to call APIs without JWT
**Expected**: 401 Unauthorized responses

### Test 2: Balance Manipulation
**Scenario**: Attempt to manipulate coin balances
**Expected**: Atomic operations prevent manipulation

### Test 3: Rate Tampering
**Scenario**: Attempt to modify rates during call
**Expected**: Frozen rates from CallSession prevent tampering

### Test 4: Session Hijacking
**Scenario**: Attempt to use another user's call session
**Expected**: Session validation prevents unauthorized access

## Postman Collection Examples

### Environment Variables
```
BASE_URL: http://localhost:5000
MALE_USER_TOKEN: <your_male_token>
FEMALE_USER_TOKEN: <your_female_token>
ADMIN_TOKEN: <your_admin_token>
FEMALE_USER_ID: <test_female_user_id>
```

### Request 1: Start Call
```
POST {{BASE_URL}}/male-user/calls/start
Authorization: Bearer {{MALE_USER_TOKEN}}
Content-Type: application/json

{
  "receiverId": "{{FEMALE_USER_ID}}",
  "callType": "audio"
}
```

### Request 2: End Call
```
POST {{BASE_URL}}/male-user/calls/end
Authorization: Bearer {{MALE_USER_TOKEN}}
Content-Type: application/json

{
  "receiverId": "{{FEMALE_USER_ID}}",
  "duration": 45,
  "callType": "audio",
  "callId": "call_session_id_from_start"
}
```

### Request 3: Get Level Info
```
GET {{BASE_URL}}/female-user/levels/info
Authorization: Bearer {{FEMALE_USER_TOKEN}}
```

### Request 4: Get Level Settings
```
GET {{BASE_URL}}/female-user/levels/settings
Authorization: Bearer {{FEMALE_USER_TOKEN}}
```

## API Changes from Previous System

### Removed APIs/Features:
- Range-based rate selection
- User-controlled rate updates
- Old per-second rate storage

### Added APIs/Features:
- CallSession model for rate freezing
- Per-minute to per-second rate conversion
- Minimum duration enforcement
- Atomic balance updates
- Session-based rate protection

### Modified APIs:
- `/male-user/calls/start` - Now includes CallSession creation
- `/male-user/calls/end` - Now uses frozen rates and minimum billing
- Level APIs - Now return fixed rates from level config

## Expected Database Changes

### New Collections:
- `callsessions` - Stores frozen rates during active calls

### Modified Collections:
- `callhistory` - Now includes `billableDuration` field
- `adminlevelconfigs` - Updated schema with fixed rates
- `femaleusers` - Rates now tied to level config

## Error Handling

### Common Error Responses:

#### Insufficient Balance:
```json
{
  "success": false,
  "message": "Insufficient balance to start call. Please recharge.",
  "data": {
    "available": 50,
    "required": 77.4
  }
}
```

#### Invalid Session:
```json
{
  "success": false,
  "message": "Call session not found or invalid. Call may have expired or already ended."
}
```

#### Multiple Sessions:
```json
{
  "success": false,
  "message": "You already have an active call session"
}
```

## Success Response Examples

### Call Start Success:
```json
{
  "success": true,
  "message": "Call can start",
  "data": {
    "callId": "call_abc123_def456_1234567890",
    "maxSeconds": 120,
    "femaleRatePerSecond": 2.0,
    "platformRatePerSecond": 0.58,
    "malePayPerSecond": 2.58,
    "callerCoinBalance": 310,
    "isAgencyFemale": false,
    "receiverLevel": 3,
    "levelConfig": {
      "audioRatePerMinute": 120,
      "videoRatePerMinute": 180,
      "platformMarginPerMinute": 35
    }
  }
}
```

### Call End Success:
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "callId": "callhistory_abc123",
    "duration": 45,
    "billableDuration": 45,
    "femaleEarningPerSecond": 2.0,
    "platformMarginPerSecond": 0.58,
    "totalCoins": 116,
    "coinsDeducted": 116,
    "femaleEarning": 90,
    "platformMargin": 26,
    "callerRemainingBalance": 194,
    "receiverNewBalance": 2500
  }
}
```

This comprehensive testing guide covers all aspects of the new level-based call rate system APIs, including detailed test cases, scenarios, and expected behaviors for your production-ready system.