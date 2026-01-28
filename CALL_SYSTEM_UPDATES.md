# Call System Updates - Paid-Call Model

## Overview
The call system has been updated to move from a **social-gated call system** to a **payment-gated call system**. This removes the mutual follow requirement and implements a pure paid-call model.

## Key Changes

### Before (OLD)
```
Follow → Mutual Follow → Call Allowed
```

### After (NEW)
```
Coins → Online Status → Not Blocked → Call Allowed
```

## Updated Call Start Flow

### 1. Authentication (UNCHANGED)
- JWT authentication
- Extract `callerId` (male user)

### 2. Input Validation (UNCHANGED)
```json
{
  "receiverId": "femaleId",
  "callType": "audio | video"
}
```

### 3. User Existence Checks (UNCHANGED)
- Fetch male user
- Fetch female user
- Validate:
  - female `status === active`
  - female `reviewStatus === accepted`

### 4. NEW: Online Status Check (MANDATORY)
```js
if (!femaleUser.onlineStatus) {
  return res.status(400).json({
    success: false,
    message: "The selected user is currently offline"
  });
}
```

### 5. Block Check (KEPT - IMPORTANT)
- Check: female blocked male
- Check: male blocked female
- If blocked → reject call

### 6. Coin Balance Validation (UNCHANGED)
- Check `adminConfig.minCallCoins`
- Validate: `male coinBalance >= minCallCoins`
- Calculate `maxSeconds`

### 7. Success Response (UNCHANGED)
```json
{
  "success": true,
  "data": {
    "maxSeconds": 120,
    "coinsPerSecond": 2.58,
    "callerCoinBalance": 310
  }
}
```

## What Was Removed

### ❌ Removed Follow Logic
- `MaleFollowing` import (removed)
- `FemaleFollowing` import (removed)
- Mutual follow database queries (removed)
- `messages.CALL.FOLLOW_EACH_OTHER` (removed)

## Call End Flow

### ✅ Unchanged
The call end flow remains exactly the same:
- Coin deduction ✅
- Female earnings ✅
- CallHistory ✅
- Transactions ✅

## Updated Validation Order (Optimized)

1. User exists ✅
2. Female online ✅
3. Block check ✅
4. Coin balance check ✅

**Reasoning:**
- Avoid unnecessary DB + math when female is offline
- Best UX
- Best performance

## Updated Error Scenarios

### ❌ Female offline
```json
{
  "success": false,
  "message": "The selected user is currently offline"
}
```

### ❌ Blocked
```json
{
  "success": false,
  "message": "You cannot call this user"
}
```

### ❌ Insufficient coins
```json
{
  "success": false,
  "message": "Minimum coins required to start call"
}
```

## System Impact

### ✅ No Schema Changes Required
Your existing models still work perfectly:
- `CallHistory`
- `Transaction`
- `AdminConfig`
- `FemaleUser.coinsPerSecond`

### ✅ No Other Code Changes Required
| Area         | Change      |
| ------------ | ----------- |
| Call End API | ❌ No change |
| Billing      | ❌ No change |
| Earnings     | ❌ No change |
| Schemas      | ❌ No change |
| Indexes      | ❌ No change |

## Final Decision Logic

```
Online + Not Blocked + Has Coins = Call Allowed
```

No social dependency.
Pure monetization + availability logic.

## Testing Scenarios

### ✅ Test Case 1: Non-followed call
- Male NOT following female
- Female is online
- Sufficient coins
- ✅ Call starts

### ❌ Test Case 2: Offline user
- Male has coins
- Female is offline
- ❌ Call rejected with "currently offline" message

### ❌ Test Case 3: Blocked user
- Male has coins
- Female is online
- Female blocked male
- ❌ Call rejected

### ❌ Test Case 4: Insufficient coins
- Female is online
- No follow relationship
- Coins < minCallCoins
- ❌ Call rejected

## Benefits of New System

1. **Monetization-focused**: Pure payment-based model
2. **Better UX**: Clear online status prevents ringing offline users
3. **Reduced friction**: No need to follow to call
4. **Maintained safety**: Block system still in place
5. **Performance**: Optimized validation order