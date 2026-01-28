# Level-Based Call Rate System

## Overview

This document describes the implementation of a level-based call rate system that allows female users to set call rates only within ranges defined by admin based on weekly earnings thresholds.

## System Components

### 1. AdminLevelConfig Model
- **Purpose**: Stores level configurations with weekly earnings thresholds and rate ranges
- **Fields**:
  - `level`: Number (required, unique)
  - `weeklyEarningsMin`: Number (minimum weekly earnings for this level)
  - `weeklyEarningsMax`: Number (maximum weekly earnings for this level)
  - `audioRateRange`: Object with min/max for audio calls
  - `videoRateRange`: Object with min/max for video calls
  - `isActive`: Boolean (default: true)

### 2. FemaleUser Model Updates
- **New Fields**:
  - `currentLevel`: Number (default: 1)
  - `audioCoinsPerMinute`: Number (audio call rate per minute)
  - `videoCoinsPerMinute`: Number (video call rate per minute)
  - `weeklyEarnings`: Number (current week's earnings for level calculation)
- **Legacy Field**:
  - `coinsPerMinute`: Number (source of truth) - kept for backward compatibility

## API Endpoints

### Admin Endpoints

#### 1. Create/Update Level Configuration
```
POST /api/admin/users/level-config
```
**Headers**: 
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "level": 1,
  "weeklyEarningsMin": 0,
  "weeklyEarningsMax": 2000,
  "audioRateRange": {
    "min": 100,
    "max": 150
  },
  "videoRateRange": {
    "min": 200,
    "max": 250
  },
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Level configuration created successfully",
  "data": {
    "_id": "config_id",
    "level": 1,
    "weeklyEarningsMin": 0,
    "weeklyEarningsMax": 2000,
    "audioRateRange": {
      "min": 100,
      "max": 150
    },
    "videoRateRange": {
      "min": 200,
      "max": 250
    },
    "isActive": true,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

#### 2. Get All Level Configurations
```
GET /api/admin/users/level-config
```
**Headers**: 
- `Authorization: Bearer <admin_token>`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "config_id",
      "level": 1,
      "weeklyEarningsMin": 0,
      "weeklyEarningsMax": 2000,
      "audioRateRange": {
        "min": 100,
        "max": 150
      },
      "videoRateRange": {
        "min": 200,
        "max": 250
      },
      "isActive": true
    }
  ]
}
```

#### 3. Update Specific Level Configuration
```
PUT /api/admin/users/level-config/:id
```
**Headers**: 
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Request Body** (partial updates allowed):
```json
{
  "level": 1,
  "weeklyEarningsMin": 0,
  "weeklyEarningsMax": 2500,
  "audioRateRange": {
    "min": 100,
    "max": 160
  },
  "videoRateRange": {
    "min": 200,
    "max": 260
  },
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Level configuration updated successfully",
  "data": {
    "_id": "config_id",
    "level": 1,
    "weeklyEarningsMin": 0,
    "weeklyEarningsMax": 2500,
    "audioRateRange": {
      "min": 100,
      "max": 160
    },
    "videoRateRange": {
      "min": 200,
      "max": 260
    },
    "isActive": true
  }
}
```

#### 4. Delete Level Configuration
```
DELETE /api/admin/users/level-config/:id
```
**Headers**: 
- `Authorization: Bearer <admin_token>`

**Response**:
```json
{
  "success": true,
  "message": "Level configuration deleted successfully",
  "data": {
    "_id": "config_id",
    "level": 1,
    "weeklyEarningsMin": 0,
    "weeklyEarningsMax": 2000
  }
}
```

#### 4. Set Female User Call Rates (Admin)
```
POST /api/admin/users/set-call-rates
```
**Headers**: 
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "userId": "female_user_id",
  "audioCoinsPerMinute": 120,
  "videoCoinsPerMinute": 220
}
```

**Response**:
```json
{
  "success": true,
  "message": "Call rates updated successfully for female_user_name",
  "data": {
    "userId": "female_user_id",
    "name": "female_user_name",
    "email": "female_user_email",
    "audioCoinsPerMinute": 120,
    "videoCoinsPerMinute": 220
  }
}
```

### Female User Endpoints

#### 1. Get Call Rate Settings
```
GET /api/female-user/call-rate-settings
```
**Headers**: 
- `Authorization: Bearer <female_token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "currentLevel": 1,
    "weeklyEarnings": 1500,
    "audioCoinsPerMinute": 120,
    "videoCoinsPerMinute": 220,
    "currentLevelConfig": {
      "level": 1,
      "weeklyEarningsMin": 0,
      "weeklyEarningsMax": 2000,
      "audioRateRange": {
        "min": 100,
        "max": 150
      },
      "videoRateRange": {
        "min": 200,
        "max": 250
      }
    },
    "allLevels": [
      {
        "level": 1,
        "weeklyEarningsMin": 0,
        "weeklyEarningsMax": 2000,
        "audioRateRange": {
          "min": 100,
          "max": 150
        },
        "videoRateRange": {
          "min": 200,
          "max": 250
        }
      }
    ]
  }
}
```

#### 2. Get Level Information
```
GET /api/female-user/level-info
```
**Headers**: 
- `Authorization: Bearer <female_token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "currentLevel": 1,
    "weeklyEarnings": 1500,
    "audioRate": 120,
    "videoRate": 220,
    "allowedAudioRange": {
      "min": 100,
      "max": 150
    },
    "allowedVideoRange": {
      "min": 200,
      "max": 250
    },
    "levelConfig": {
      "weeklyEarningsMin": 0,
      "weeklyEarningsMax": 2000
    }
  }
}
```

#### 3. Update Call Rates
```
PATCH /api/female-user/call-rates
```
**Headers**: 
- `Authorization: Bearer <female_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "audioCoinsPerMinute": 130,
  "videoCoinsPerMinute": 230
}
```

**Response**:
```json
{
  "success": true,
  "message": "Call rates updated successfully",
  "data": {
    "currentLevel": 1,
    "audioCoinsPerMinute": 130,
    "videoCoinsPerMinute": 230
  }
}
```

#### 4. Calculate Level
```
POST /api/female-user/calculate-level
```
**Headers**: 
- `Authorization: Bearer <female_token>`

**Response**:
```json
{
  "success": true,
  "message": "Level calculated and updated successfully",
  "data": {
    "currentLevel": 2,
    "weeklyEarnings": 2500
  }
}
```

#### 5. Get All Levels
```
GET /api/female-user/levels
```
**Headers**: 
- `Authorization: Bearer <female_token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "levels": [
      {
        "level": 1,
        "weeklyEarningsMin": 0,
        "weeklyEarningsMax": 2000,
        "audioRateRange": {
          "min": 100,
          "max": 150
        },
        "videoRateRange": {
          "min": 200,
          "max": 250
        }
      }
    ],
    "currentUserLevel": 1
  }
}
```

## Business Logic

### Level Calculation
- System calculates weekly earnings (Monday to Sunday)
- User level is determined by finding the level config where weekly earnings fall within the range
- Levels are automatically upgraded when earnings cross thresholds
- Level calculation happens on:
  - Dashboard load
  - After every completed call
  - When calling `/calculate-level` endpoint

### Rate Validation
- Female users can only set rates within their level's allowed range
- Audio and video rates are validated separately
- Admins can set rates for any user within their level's range
- Validation happens via middleware for user endpoints

### Call System Integration
- Call system now uses `audioCoinsPerMinute` or `videoCoinsPerMinute` based on call type
- For audio calls: uses `audioCoinsPerMinute`
- For video calls: uses `videoCoinsPerMinute`
- Rates are converted from per-minute to per-second internally during calls

## Example Level Configuration

| Level | Weekly Earnings | Audio Rate Range | Video Rate Range |
|-------|----------------|------------------|------------------|
| 1     | 0 – 2000       | 100 – 150        | 200 – 250        |
| 2     | 2001 – 5000    | 150 – 200        | 250 – 300        |
| 3     | 5001 – 10000   | 200 – 300        | 300 – 450        |

## Error Handling

### Common Error Responses

**Invalid rate range**:
```json
{
  "success": false,
  "message": "Audio rate must be between 100 and 150 coins per minute"
}
```

**Level configuration not found**:
```json
{
  "success": false,
  "message": "Level configuration not found for your current level"
}
```

**User not found**:
```json
{
  "success": false,
  "message": "Female user not found"
}
```

## Migration Strategy

1. **Database Migration**:
   - Existing `coinsPerMinute` values are preserved as legacy
   - New fields are initialized with default values
   - Level is initialized to 1 for all existing users

2. **Frontend Migration**:
   - New endpoints can be used alongside legacy endpoints
   - Gradual migration of frontend to use new level-based system
   - Legacy `/earning-rate` endpoint maintained for backward compatibility

## Testing Guide

### 1. Admin Configuration Testing
- Create level configurations
- Verify all levels can be retrieved
- Test level deletion
- Verify validation for invalid configurations

### 2. Female User Rate Management
- Test rate updates within allowed range
- Test rate updates outside allowed range (should fail)
- Verify rate persistence after updates
- Test audio and video rate separately

### 3. Call System Integration
- Start audio calls and verify correct rate is used
- Start video calls and verify correct rate is used
- Test call billing calculations
- Verify earnings are credited correctly

### 4. Level Calculation
- Simulate different weekly earnings scenarios
- Verify level upgrades work correctly
- Test edge cases at threshold boundaries
- Verify weekly earnings calculation accuracy

### 5. End-to-End Flow
- Create level configurations
- Set up female user with earnings
- Verify level assignment based on earnings
- Test call rate setting within level limits
- Execute calls and verify billing