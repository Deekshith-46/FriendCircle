# Minimum Call Coins Feature

## Overview
This feature implements a new requirement for the call system where male users must have a minimum number of coins to start a call. This prevents 1-second calls and call spam while ensuring a better user experience.

## New Admin Setting

### Configuration
- **Setting Name**: `minCallCoins`
- **Default Value**: 60 coins
- **Location**: Stored in `AdminConfig` collection in MongoDB
- **Admin Route**: `POST /api/admin/config/min-call-coins`

### Updating the Setting
Admins can update the minimum call coins requirement using the following endpoint:

```
POST /api/admin/config/min-call-coins
Headers: 
  Authorization: Bearer <ADMIN_TOKEN>
  Content-Type: application/json

Body:
{
  "minCallCoins": 60
}
```

## New Call Flow Implementation

### 1. Starting a Call

Before a male user can start a call, they must pass through the new validation:

**Endpoint**: `POST /api/male-user/calls/start`

**Request Body**:
```json
{
  "receiverId": "female_user_id_here",
  "callType": "video" // or "audio"
}
```

**Validation Steps**:
1. Check if both users follow each other
2. Check block lists (ensure neither user has blocked the other)
3. Get the female user's `coinsPerSecond` rate
4. Get the admin `minCallCoins` setting
5. Verify male user has at least `minCallCoins` in their balance
6. Calculate `maxSeconds = floor(maleCoins / coinsPerSecond)`
7. If `maxSeconds <= 0`, reject the call
8. If all validations pass, return `maxSeconds` to frontend

**Success Response**:
```json
{
  "success": true,
  "message": "Call can be started",
  "data": {
    "maxSeconds": 80,
    "coinsPerSecond": 2,
    "callerCoinBalance": 160,
    "minCallCoins": 60
  }
}
```

**Error Responses**:
```json
// Not enough coins for minimum requirement
{
  "success": false,
  "message": "Minimum 60 coins required to start a call",
  "data": {
    "available": 3,
    "required": 60,
    "shortfall": 57
  }
}

// Not enough coins for even 1 second
{
  "success": false,
  "message": "Not enough coins to start call",
  "data": {
    "available": 1,
    "rate": 2,
    "maxSeconds": 0
  }
}
```

### 2. Frontend Timer Implementation

Upon receiving a successful response from `/calls/start`, the frontend should:

1. Display a countdown timer set to `maxSeconds`
2. Automatically end the Agora call when the timer reaches 0
3. Call the existing `/calls/end` endpoint with the actual duration

### 3. Ending a Call

The existing `/calls/end` endpoint has been updated with enhanced safety measures:

**Endpoint**: `POST /api/male-user/calls/end`

**Enhanced Logic**:
1. Calculate `maxSeconds = floor(maleCoins / coinsPerSecond)`
2. Apply hard limit: `billableSeconds = min(actualDuration, maxSeconds)`
3. Calculate `coinsToCharge = billableSeconds * coinsPerSecond`
4. Even if frontend sends a higher duration, billing is capped at `maxSeconds`

**Example**:
- Male has 160 coins
- Female rate is 2 coins/second
- `maxSeconds = floor(160 / 2) = 80 seconds`
- If frontend sends 85 seconds, user is only charged for 80 seconds

## Test Cases

### Case 1: User with insufficient coins (< minCallCoins)
- Male coins: 3
- Min call coins: 60
- Result: Call rejected with "Minimum 60 coins required to start a call"

### Case 2: User with minimum coins
- Male coins: 60
- Female rate: 2 coins/second
- Max seconds: 30
- Result: Call allowed for up to 30 seconds

### Case 3: User with sufficient coins
- Male coins: 160
- Female rate: 2 coins/second
- Max seconds: 80
- Result: Call allowed for up to 80 seconds

### Case 4: Frontend bug protection
- Male coins: 160
- Female rate: 2 coins/second
- Frontend sends: 200 seconds
- Actual billing: 80 seconds (capped at maxSeconds)

## Models and Collections Updated

1. **New Model**: `AdminConfig` - Stores global settings including `minCallCoins`
2. **Updated Controller**: `callController.js` - Added `startCall` function and enhanced `endCall` function
3. **Updated Routes**: Added `/api/male-user/calls/start` and `/api/admin/config/*` routes

## Security and Safety Features

1. **Double Validation**: Checks both minimum coins requirement and per-second calculation
2. **Hard Limits**: Billing is capped at maximum possible seconds based on balance
3. **Atomic Operations**: Coin deductions happen in a single transaction
4. **Comprehensive Error Handling**: Clear error messages for different failure scenarios
5. **Block List Protection**: Ensures blocked users cannot initiate calls
6. **Mutual Follow Verification**: Only matched users can call each other

This implementation ensures a fair, secure, and user-friendly calling experience while preventing abuse of the system.