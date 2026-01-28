# KYC Implementation Documentation

This document provides a comprehensive overview of the KYC system implementation with the new method-level status lifecycle.

## 1. KYC Status Lifecycle

### Overall Status Values
- `completeKyc` - User has NOT started KYC
- `pending` - User submitted KYC, waiting for admin
- `accepted` - KYC approved → withdrawal allowed
- `rejected` - KYC rejected → withdrawal blocked

### Method-Level Status Values
- `pending` - Method submitted, waiting for admin approval
- `accepted` - Method approved → can be used for withdrawal
- `rejected` - Method rejected → cannot be used for withdrawal

### Meaning:
| Overall Status  | Meaning                               |
| --------------- | ------------------------------------- |
| `completeKyc`   | User has NOT started KYC              |
| `pending`       | User submitted KYC, waiting for admin |
| `accepted`      | At least one method is approved → withdrawal allowed     |
| `rejected`      | No methods approved → withdrawal blocked     |

| Method Status   | Meaning                               |
| --------------- | ------------------------------------- |
| `pending`       | Method submitted, waiting for admin   |
| `accepted`      | Method approved → can be used         |
| `rejected`      | Method rejected → cannot be used      |

## 2. Schema Changes

### FemaleUser Schema
```js
kycStatus: {
  type: String,
  enum: ['completeKyc', 'pending', 'accepted', 'rejected'],
  default: 'completeKyc'
},
kycDetails: {
  bank: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    accountNumber: String,
    ifsc: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    verifiedAt: Date
  },
  upi: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    upiId: String,
    status: { type: String, enum: ['pending', 'rejected', 'accepted'], default: 'pending' },
    verifiedAt: Date
  }
},
```

### AgencyUser Schema
```js
kycStatus: {
  type: String,
  enum: ['completeKyc', 'pending', 'accepted', 'rejected'],
  default: 'completeKyc'
},
kycDetails: {
  bank: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    accountNumber: String,
    ifsc: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    verifiedAt: Date
  },
  upi: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    upiId: String,
    status: { type: String, enum: ['pending', 'rejected', 'accepted'], default: 'pending' },
    verifiedAt: Date
  }
},
```

## 3. User-Side KYC Submission

### Conditions for submitting KYC:
- `profileCompleted` must be `true`
- `reviewStatus` must be `accepted`

### Logic Added (Female + Agency):
- No longer blocks submission based on overall `kycStatus`
- Each method (Bank/UPi) can be submitted independently
- Updates overall `kycStatus` to `pending` if no methods were previously approved

```js
// For bank submission
if (method === "account_details" && accountDetails) {
  user.kycDetails.bank = {
    _id: new mongoose.Types.ObjectId(),
    name: accountDetails.name,
    accountNumber: accountDetails.accountNumber,
    ifsc: accountDetails.ifsc,
    status: 'pending',
    verifiedAt: null
  };
  
  // Update overall kycStatus if no approved method exists
  if (user.kycStatus === 'completeKyc') {
    user.kycStatus = 'pending';
  }
}
```

## 4. Admin KYC Review API

### Admin Controller Logic
Admin approves/rejects each method independently:
- Approving a method sets its status to `accepted`
- Rejecting a method sets its status to `rejected`
- Overall status logic:
  - If any method is `accepted`, overall status is `accepted`
  - If all methods are `rejected`, overall status is `rejected`

### API Endpoint: `updateKYCStatus`
```js
// Admin can update overall KYC status
exports.updateKYCStatus = async (req, res) => {
  const { userId, userType, kycStatus } = req.body;
  // userType = 'female' | 'agency'
  // kycStatus = 'accepted' | 'rejected'

  const user = await Model.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.kycStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'KYC is not under review'
    });
  }

  // Update overall status and mark pending methods accordingly
  user.kycStatus = kycStatus;
  if (kycStatus === 'accepted' && user.kycDetails) {
    // Mark any pending methods as accepted
    if (user.kycDetails.bank && user.kycDetails.bank.status === 'pending') {
      user.kycDetails.bank.status = 'accepted';
      if (!user.kycDetails.bank.verifiedAt) {
        user.kycDetails.bank.verifiedAt = new Date();
      }
    }
    if (user.kycDetails.upi && user.kycDetails.upi.status === 'pending') {
      user.kycDetails.upi.status = 'accepted';
      if (!user.kycDetails.upi.verifiedAt) {
        user.kycDetails.upi.verifiedAt = new Date();
      }
    }
  }
  
  await user.save();

  return res.json({ success: true, data: user });
};
```

## 5. Withdrawal Restriction

### Before withdrawal (Female + Agency):
```js
// Check if at least one method is accepted
if (!(user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') && 
    !(user.kycDetails.upi && user.kycDetails.upi.status === 'accepted')) {
  return res.status(403).json({
    success: false,
    message: 'KYC not approved. Withdrawal not allowed'
  });
}
```

## 6. UI Logic (Frontend Rules)

| Situation       | UI Behavior                         |
| --------------- | ----------------------------------- |
| No KYC started  | Show **Complete KYC** form          |
| Bank pending    | Show **Under Review**               |
| Bank approved   | Enable Withdraw                     |
| UPI added later | Show UPI "Under Review"             |
| One approved    | Withdraw allowed                    |
| Both rejected   | Withdraw blocked                    |

## 7. File Changes Summary

### Updated Models:
- `src/models/femaleUser/FemaleUser.js` - Added method-level status fields
- `src/models/agency/AgencyUser.js` - Added method-level status fields

### Updated Controllers:
- `src/controllers/femaleUserControllers/kycController.js` - Updated to handle method-level submission and approval
- `src/controllers/agencyControllers/kycController.js` - Updated to handle method-level submission and approval
- `src/controllers/adminControllers/userManagementController.js` - Updated to handle method-level admin approval
- `src/controllers/common/withdrawalController.js` - Updated to check method-level approval

### Updated Models:
- `src/models/femaleUser/KYC.js` - Added comment for status compatibility
- `src/models/agency/KYC.js` - Added comment for status compatibility

### Updated Validation Messages:
- `src/validations/messages.js` - Added comment for status compatibility

## 8. Postman Test Checklist

### Female / Agency:
1. New user → `kycStatus = completeKyc`, no methods
2. Submit Bank → `bank.status = pending`, `kycStatus = pending`
3. Admin approves Bank → `bank.status = accepted`, `kycStatus = accepted`
4. Submit UPI later → `upi.status = pending`, `kycStatus = accepted` (still)
5. Withdrawal attempt → ✅ allowed via Bank
6. Admin approves UPI → `upi.status = accepted`, `kycStatus = accepted`
7. Admin rejects Bank → `bank.status = rejected`, `kycStatus = accepted` (UPI still approved)
8. Withdrawal attempt → ✅ allowed via UPI

## 9. Important Safety Notes
- ❌ Do NOT block method submission based on overall status
- ✅ Allow independent submission of Bank and UPI
- ✅ Maintain withdrawal access when at least one method is approved
- ✅ Admin can approve/reject each method independently

## 10. Why This Design is Correct
- User-friendly (allows adding methods later)
- Matches real payment apps (PhonePe, GPay, Paytm)
- No blocking UX
- Admin has full control over each method
- No accidental lockouts
- Future-proof (can add Paytm, PayPal, etc.)
- Maintains withdrawal access when at least one method is approved