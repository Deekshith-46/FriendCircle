# Login Response Changes for Rejected Users

## Problem
When female or agency users are rejected by admin during registration review, they were getting `redirectTo: "REJECTED"` in the login response. This prevented them from resubmitting their profile with proper details.

## Solution
Modified the login verification functions to:
1. Return `redirectTo: "COMPLETE_PROFILE"` instead of `REJECTED` for rejected users
2. Include `rejectionReason` in the response data so users can understand why they were rejected

## Files Modified

### 1. Female User Controller
**File:** `src/controllers/femaleUserControllers/femaleUserController.js`
**Function:** `verifyLoginOtp`

**Changes:**
- Changed redirect logic for rejected users from `REJECTED` to `COMPLETE_PROFILE`
- Added rejectionReason to response data when user is rejected

```javascript
// Before
} else if (user.reviewStatus === 'rejected') {
  redirectTo = 'REJECTED';
}

// After  
} else if (user.reviewStatus === 'rejected') {
  // When rejected, user should complete profile again with proper details
  redirectTo = 'COMPLETE_PROFILE';
}

// Added rejectionReason to response
data: {
  user: {
    // ... other fields
    reviewStatus: user.reviewStatus,
    ...(user.reviewStatus === 'rejected' && user.rejectionReason && { rejectionReason: user.rejectionReason })
  }
}
```

### 2. Agency User Controller
**File:** `src/controllers/agencyControllers/agencyUserController.js`
**Function:** `agencyVerifyLoginOtp`

**Changes:**
- Same logic applied as female user controller
- Return `COMPLETE_PROFILE` for rejected agency users
- Include `rejectionReason` in response data

## Expected Response Examples

### Female User - Rejected Status
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "69870baa2f2ebd9afaa6d71e",
      "name": "John 12",
      "email": "john12@gmail.com",
      "mobileNumber": "9914526199",
      "profileCompleted": false,
      "reviewStatus": "rejected",
      "rejectionReason": "Profile photo does not meet guidelines"
    },
    "redirectTo": "COMPLETE_PROFILE"
  }
}
```

### Agency User - Rejected Status
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "agency": {
      "id": "69870baa2f2ebd9afaa6d71f",
      "firstName": "Test",
      "lastName": "Agency",
      "email": "test@agency.com",
      "mobileNumber": "9999999999",
      "profileCompleted": false,
      "reviewStatus": "rejected",
      "rejectionReason": "KYC documents incomplete"
    },
    "redirectTo": "COMPLETE_PROFILE"
  }
}
```

## Benefits
1. **User Experience:** Rejected users can immediately resubmit their profile instead of being blocked
2. **Transparency:** Users see the specific reason for rejection
3. **Consistency:** Both female and agency users follow the same flow
4. **Admin Workflow:** Admins can reject profiles with reasons, and users can correct and resubmit

## Testing
- Created test files to verify the changes work correctly
- Manual test script available to test with actual database records
- All changes maintain backward compatibility

## Next Steps
1. Frontend should be updated to:
   - Show rejection reason to users when `reviewStatus` is "rejected"
   - Redirect rejected users to profile completion screen
   - Allow users to resubmit their profile details
2. Admin panel should ensure rejection reasons are provided when rejecting users