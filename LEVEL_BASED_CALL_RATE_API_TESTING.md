# Level-Based Call Rate System - API Testing Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [API Endpoints](#api-endpoints)
4. [Testing Scenarios](#testing-scenarios)
5. [Test Cases](#test-cases)
6. [Expected Behaviors](#expected-behaviors)
7. [Integration Points](#integration-points)

## Introduction

This document provides comprehensive API testing for the level-based call rate system. The system implements fixed pricing per level with per-second billing, minimum billable duration, and level-based platform margins.

## System Overview

### Core Features
- **Admin-controlled fixed pricing**: Rates defined per level by admin
- **Per-minute pricing, per-second billing**: Rates defined per minute, charged per second
- **Minimum billable duration**: 30-second minimum enforced
- **Level-based platform margins**: Different margins per level and agency/non-agency
- **Weekly auto-leveling**: Automatic level assignment based on weekly earnings
- **Rate consistency**: CallSession freezes rates at call start

### Key Components
- `AdminLevelConfig`: Stores level-based pricing and margins
- `CallSession`: Freezes rates during active calls
- `CallHistory`: Records completed calls with billing details

## API Endpoints

### 1. Level Information APIs

#### GET `/female-user/levels/info`
**Purpose**: Get female user's level information and fixed rates

**Authentication**: Female User JWT Required

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

#### GET `/female-user/levels/settings`
**Purpose**: Get detailed call rate settings with level config

**Authentication**: Female User JWT Required

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

#### PUT `/female-user/levels/rates`
**Purpose**: Synchronize female rates with level config (internal use)

**Authentication**: Female User JWT Required

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

### 2. Call APIs

#### POST `/male-user/calls/start`
**Purpose**: Start a call and calculate maximum possible duration

**Authentication**: Male User JWT Required

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

#### POST `/male-user/calls/end`
**Purpose**: End a call and process billing

**Authentication**: Male User JWT Required

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

### 3. Admin APIs (for Level Configuration)

#### GET `/admin/level-configs`
**Purpose**: Get all level configurations

**Authentication**: Admin JWT Required

#### POST `/admin/level-configs`
**Purpose**: Create/update level configuration

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

## Testing Scenarios

### Scenario 1: Normal Call Flow
1. Male user starts call with female user
2. System validates minimum balance and frozen rates
3. Call proceeds with timer
4. Male user ends call after 45 seconds
5. System bills 45 seconds (no minimum applied)
6. Coins distributed: Female, Admin, Agency

### Scenario 2: Minimum Duration Billing
1. Male user starts call with female user
2. Call ends after 15 seconds
3. System bills 30 seconds (minimum applied)
4. Proper coin distribution occurs

### Scenario 3: Insufficient Balance Check
1. Male user tries to start call with insufficient balance
2. System rejects call before timer starts
3. No coins deducted

### Scenario 4: Rate Change During Call (Protected)
1. Admin changes level config
2. Active call continues with frozen rates
3. New calls use updated rates

## Test Cases

### Test Case 1: Valid Call Start
**Given**: Male user has sufficient balance
**When**: Male user starts call with female user level 3
**Then**: 
- Call session is created with frozen rates
- Response includes maxSeconds and billing rates
- No coins deducted yet

**API Call**:
```bash
POST /male-user/calls/start
Authorization: Bearer <male_user_token>
{
  "receiverId": "<female_user_id>",
  "callType": "audio"
}
```

### Test Case 2: Minimum Balance Validation
**Given**: Male user has balance below minimum required
**When**: Male user tries to start call
**Then**: 
- Call is rejected
- Error message returned
- No session created

**API Call**:
```bash
POST /male-user/calls/start
Authorization: Bearer <male_user_token>
{
  "receiverId": "<female_user_id>",
  "callType": "audio"
}
```

### Test Case 3: Call End with Minimum Duration
**Given**: Call lasted 20 seconds
**When**: Male user ends call
**Then**: 
- System bills 30 seconds (minimum)
- Coins properly distributed
- Call session marked inactive

**API Call**:
```bash
POST /male-user/calls/end
Authorization: Bearer <male_user_token>
{
  "receiverId": "<female_user_id>",
  "duration": 20,
  "callType": "audio",
  "callId": "<call_session_id>"
}
```

### Test Case 4: Call End with Normal Duration
**Given**: Call lasted 60 seconds
**When**: Male user ends call
**Then**: 
- System bills 60 seconds
- Coins properly distributed
- Call session marked inactive

### Test Case 5: Concurrent Call Prevention
**Given**: Male user has active call
**When**: Male user tries to start another call
**Then**: 
- Second call is rejected
- Error message returned
- Active session remains

### Test Case 6: Insufficient Balance at End
**Given**: Male user's balance changed during call
**When**: Male user tries to end call
**Then**: 
- Call is marked as failed
- Session marked inactive
- No coins deducted

## Expected Behaviors

### 1. Fair Billing
- Per-second billing with 30-second minimum
- No floating-point coin leakage
- Single rounding point to prevent loss

### 2. Rate Consistency
- Rates frozen at call start
- No mid-call rate changes
- Session-based rate guarantee

### 3. Financial Safety
- Atomic balance updates
- Race condition protection
- No negative balances

### 4. Anti-Exploit Measures
- Single active session per user
- Minimum balance entry gate
- Proper validation at both start and end

### 5. Level-Based Monetization
- Different rates per level
- Different margins per level
- Agency vs non-agency splits

## Integration Points

### 1. Database Models
- `AdminLevelConfig` - Level-based pricing
- `CallSession` - Rate freezing
- `CallHistory` - Billing records
- `FemaleUser` - Level tracking
- `MaleUser` - Balance management

### 2. External Dependencies
- Authentication middleware
- Transaction logging
- Wallet balance updates
- Agency commission tracking

### 3. Cron Jobs
- Weekly level assignment job
- Session cleanup (TTL)

## Error Scenarios

### 1. Start Call Errors
- Invalid receiver ID
- Insufficient balance
- Existing active session
- Level config not found

### 2. End Call Errors
- Invalid call session
- Balance changed during call
- Admin config issues
- Insufficient balance validation

## Success Metrics

### 1. Performance
- Fast call start (under 200ms)
- Atomic end call processing
- Session cleanup automation

### 2. Financial Accuracy
- No coin leakage
- Correct revenue splits
- Accurate audit trails

### 3. User Experience
- Clear error messages
- Fair billing
- No unexpected charges