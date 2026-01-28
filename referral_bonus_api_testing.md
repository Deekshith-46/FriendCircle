# Referral Bonus API Testing Guide

## Overview
This document provides comprehensive testing scenarios for the referral bonus system in the Friend Circle application. The system supports three user types: Female, Agency, and Male, with specific referral rules and bonus triggers.

## Referral System Rules

### Who Can Refer Whom
- **Female** → **Female** only
- **Agency** → **Agency** OR **Female**
- **Male** → **Male** only

### Bonus Values (Dynamic from Config API)
- `femaleReferralBonus`
- `agencyReferralBonus`
- `maleReferralBonus`

### Bonus Credit Location
- **Female & Agency** → `walletBalance`
- **Male** → `coinBalance`

### Bonus Trigger Conditions
1. **Female**: Issue bonus ONLY AFTER `reviewStatus` becomes "accepted" and `referralBonusAwarded` is false
2. **Agency**: Issue bonus ONLY AFTER `reviewStatus` becomes "accepted" and `referralBonusAwarded` is false
3. **Male**: Issue bonus ONLY AFTER `profileCompleted` becomes true and `referralBonusAwarded` is false

## API Endpoints

### Admin Configuration Endpoints

#### 1. Get Referral Bonus Configuration
```
GET /api/admin/config/referral-bonus
Headers: Authorization: Bearer <admin_token>
Response:
{
  "success": true,
  "data": {
    "femaleReferralBonus": 100,
    "agencyReferralBonus": 150,
    "maleReferralBonus": 200
  }
}
```

#### 2. Update Referral Bonus Configuration
```
POST /api/admin/config/referral-bonus
Headers: Authorization: Bearer <admin_token>
Body:
{
  "femaleReferralBonus": 100,
  "agencyReferralBonus": 150,
  "maleReferralBonus": 200
}
Response:
{
  "success": true,
  "message": "Referral bonus updated successfully",
  "data": {
    "femaleReferralBonus": 100,
    "agencyReferralBonus": 150,
    "maleReferralBonus": 200
  }
}
```

### User Registration with Referral

#### 3. Female User Registration with Referral Code
```
POST /api/female/register
Body:
{
  "email": "female@example.com",
  "mobileNumber": "9876543210",
  "referralCode": "F1234567"  // Optional referral code
}
Response:
{
  "success": true,
  "message": "OTP sent to email",
  "otp": 1234
}
```

#### 4. Agency User Registration with Referral Code
```
POST /api/agency/register
Body:
{
  "email": "agency@example.com",
  "mobileNumber": "9876543211",
  "referralCode": "A123456"   // Optional referral code
}
Response:
{
  "success": true,
  "message": "OTP sent to email",
  "otp": 1234
}
```

#### 5. Male User Registration with Referral Code
```
POST /api/male/register
Body:
{
  "email": "male@example.com",
  "mobileNumber": "9876543212",
  "referralCode": "M1234567"  // Optional referral code
}
Response:
{
  "success": true,
  "message": "OTP sent to email",
  "otp": 1234
}
```

### Profile Completion & Review Status Updates

#### 6. Complete Male Profile (Triggers Referral Bonus)
```
POST /api/male/complete-profile
Headers: Authorization: Bearer <user_token>
Response:
{
  "success": true,
  "message": "Profile completed successfully",
  "data": {
    "profileCompleted": true
  }
}
```

#### 7. Update Female User Review Status (Triggers Referral Bonus)
```
POST /api/admin/female/update-review-status
Headers: Authorization: Bearer <admin_token>
Body:
{
  "userId": "<female_user_id>",
  "reviewStatus": "accepted"
}
Response:
{
  "success": true,
  "message": "Review status updated successfully",
  "data": {
    "userId": "<female_user_id>",
    "reviewStatus": "accepted"
  }
}
```

#### 8. Update Agency User Review Status (Triggers Referral Bonus)
```
POST /api/admin/agency/update-review-status
Headers: Authorization: Bearer <admin_token>
Body:
{
  "userId": "<agency_user_id>",
  "reviewStatus": "accepted"
}
Response:
{
  "success": true,
  "message": "Review status updated successfully",
  "data": {
    "userId": "<agency_user_id>",
    "reviewStatus": "accepted"
  }
}
```

### User Profile Endpoints

#### 9. Get User Balance Information
```
GET /api/female/balance-info
Headers: Authorization: Bearer <user_token>
Response:
{
  "success": true,
  "data": {
    "walletBalance": {
      "coins": 100,
      "rupees": 10
    },
    "coinBalance": {
      "coins": 0,
      "rupees": 0
    },
    "conversionRate": {
      "coinsPerRupee": 10
    }
  }
}
```

```
GET /api/male/balance-info
Headers: Authorization: Bearer <user_token>
Response:
{
  "success": true,
  "data": {
    "walletBalance": {
      "coins": 0,
      "rupees": 0
    },
    "coinBalance": {
      "coins": 200,
      "rupees": 20
    },
    "conversionRate": {
      "coinsPerRupee": 10
    }
  }
}
```

## Test Scenarios

### Scenario 1: Female → Female Referral
1. Register Agency user (get referral code A123456)
2. Register Female user 1 with Agency referral code
3. Register Female user 2 with Female user 1's referral code
4. Update Female user 2 review status to "accepted"
5. Verify both Female user 1 and Female user 2 receive `femaleReferralBonus` in walletBalance
6. Check transaction records for both users

### Scenario 2: Agency → Female Referral
1. Register Agency user (get referral code A123456)
2. Register Female user with Agency referral code
3. Update Female user review status to "accepted"
4. Verify Agency user receives `agencyReferralBonus` in walletBalance
5. Verify Female user receives `femaleReferralBonus` in walletBalance
6. Check transaction records for both users

### Scenario 3: Agency → Agency Referral
1. Register Agency user 1 (get referral code A123456)
2. Register Agency user 2 with Agency user 1's referral code
3. Update Agency user 2 review status to "accepted"
4. Verify both Agency users receive `agencyReferralBonus` in walletBalance
5. Check transaction records for both users

### Scenario 4: Male → Male Referral
1. Register Male user 1 (get referral code M1234567)
2. Register Male user 2 with Male user 1's referral code
3. Complete profile for Male user 2
4. Verify both Male users receive `maleReferralBonus` in coinBalance
5. Check transaction records for both users

### Scenario 5: Duplicate Bonus Prevention
1. Register Female user with referral code
2. Update review status to "accepted" (triggers bonus)
3. Update review status again to "accepted"
4. Verify bonus is awarded only once

### Scenario 6: Self-Referral Prevention
1. Register user with their own referral code (if possible)
2. Verify no bonus is awarded

### Scenario 7: Bonus Trigger Validation
1. Register Female user with referral code
2. Update review status to "pending" - no bonus should be awarded
3. Update review status to "rejected" - no bonus should be awarded
4. Update review status to "accepted" - bonus should be awarded

## Expected Transaction Records

When referral bonus is awarded, two transaction records should be created:
1. Transaction for referrer (credit action)
2. Transaction for referred user (credit action)

### Transaction Schema
```javascript
{
  userType: 'female'|'agency'|'male',
  userId: ObjectId,
  operationType: 'wallet'|'coin',
  action: 'credit',
  amount: Number,
  message: String,
  balanceAfter: Number,
  createdBy: ObjectId
}
```

## Error Handling

### 400 Bad Request Scenarios
- Invalid referral code format
- Referral code of wrong user type (e.g., Male referral code for Female user)
- Missing required fields

### 404 Not Found Scenarios
- Invalid user ID in admin endpoints
- Non-existent referral code

### 401 Unauthorized Scenarios
- Missing or invalid JWT token
- Insufficient permissions for admin endpoints

## API Response Format

All API responses follow this format:
```javascript
{
  "success": true|false,
  "message": "Optional message",
  "data": {}, // Optional data
  "error": "Error details if success is false"
}
```

## Testing Checklist

- [ ] Referral code generation works for all user types
- [ ] Referral code validation works during registration
- [ ] Bonus awarded only when trigger conditions are met
- [ ] Bonus credited to correct balance type (wallet vs coin)
- [ ] Duplicate bonus prevention works
- [ ] Self-referral blocked
- [ ] Transaction records created for both referrer and referee
- [ ] Admin config endpoints work correctly
- [ ] All user types can receive appropriate bonuses
- [ ] Referral rules enforced (Female → Female only, etc.)
- [ ] Error handling works as expected
- [ ] API responses maintain existing format
- [ ] No existing functionality broken