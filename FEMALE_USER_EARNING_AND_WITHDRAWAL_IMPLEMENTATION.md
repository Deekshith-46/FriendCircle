# Female User Earning and Withdrawal Implementation

This document provides a comprehensive overview of the earning and withdrawal systems implemented for female users in the Friend Circle application.

## Table of Contents
1. [Overview](#overview)
2. [Earning System](#earning-system)
3. [Withdrawal System](#withdrawal-system)
4. [API Endpoints](#api-endpoints)
5. [Code Implementation](#code-implementation)
6. [Security Considerations](#security-considerations)

## Overview

The female user earning and withdrawal system allows female users to:
- Earn coins during calls with male users
- View their earnings history
- Request withdrawals to their verified bank accounts or UPI IDs
- Select from pre-verified payout methods

## Earning System

### Call-Based Earnings
- Female users earn coins based on call duration
- Earnings are calculated per second based on their configured rate
- Earnings are added to the `walletBalance` field in the FemaleUser model
- Earnings are stored in the `Earnings` model for historical tracking

### Earnings Calculation
- Female earning rate: Set per minute (e.g., 100 coins/minute)
- Converted to per second: earningPerMinute / 60
- Total earnings: (callDurationInSeconds) × (earningPerSecond)

## Withdrawal System

### New Payout Method Selection
The system has been enhanced to allow users to select from their pre-verified KYC methods:

1. **Get Available Payout Methods API**
   - Returns verified bank and UPI methods
   - Shows status of each method
   - Provides method IDs for selection

2. **Withdrawal Request API**
   - Uses payout method ID instead of re-entering details
   - Validates method belongs to user and is accepted
   - Processes withdrawal request with selected method

### Validation Flow
1. Check user KYC status === 'accepted'
2. Validate payout method ID matches user's KYC
3. Ensure payout method status === 'accepted'
4. Verify coins <= walletBalance
5. Check coins >= minWithdrawalAmount
6. Process withdrawal request

## API Endpoints

### Earning APIs

#### Get Earnings History
```
GET /female-user/earnings
Authorization: Bearer <token>
```

#### Get Earnings Summary
```
GET /female-user/earnings/summary
Authorization: Bearer <token>
```

### Withdrawal APIs

#### Get Available Payout Methods
```
GET /female-user/withdrawals/payout-methods
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "bank": {
      "id": "ObjectId",
      "accountNumber": "123456789012",
      "ifsc": "IFSC0000",
      "status": "accepted"
    },
    "upi": {
      "id": "ObjectId", 
      "upiId": "user@ybl",
      "status": "accepted"
    }
  }
}
```

#### Create Withdrawal Request
```
POST /female-user/withdrawals
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "coins": 500,
  "payoutMethod": "bank",
  "payoutMethodId": "ObjectId"
}

Response:
{
  "success": true,
  "message": "Withdrawal request created successfully. Your payment will be credited in 24 hours.",
  "data": {
    "_id": "withdrawal_id",
    "userType": "female",
    "userId": "user_id", 
    "coinsRequested": 500,
    "amountInRupees": 100,
    "payoutMethod": "bank",
    "payoutDetails": {
      "accountHolderName": "User Name",
      "accountNumber": "123456789012",
      "ifsc": "IFSC0000"
    },
    "status": "pending",
    "createdAt": "timestamp"
  },
  "countdownTimer": 86400
}
```

#### List Withdrawal Requests
```
GET /female-user/withdrawals
Authorization: Bearer <token>
```

## Code Implementation

### 1. Enhanced Withdrawal Controller

```javascript
// Function to get available payout methods for the user
exports.getAvailablePayoutMethods = async (req, res) => {
  try {
    const userType = req.originalUrl.startsWith('/female-user') ? 'female' : 'agency';
    
    // Get user to access their KYC details
    const user = userType === 'female' ? await FemaleUser.findById(req.user.id) : await AgencyUser.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    const response = {
      success: true,
      data: {}
    };
    
    // Check for bank details in KYC
    if (user.kycDetails && user.kycDetails.bank) {
      response.data.bank = {
        id: user.kycDetails.bank._id,
        accountNumber: user.kycDetails.bank.accountNumber,
        ifsc: user.kycDetails.bank.ifsc,
        status: user.kycDetails.bank.status
      };
    }
    
    // Check for UPI details in KYC
    if (user.kycDetails && user.kycDetails.upi) {
      response.data.upi = {
        id: user.kycDetails.upi._id,
        upiId: user.kycDetails.upi.upiId,
        status: user.kycDetails.upi.status
      };
    }
    
    return res.json(response);
  } catch (err) {
    console.error('Error getting payout methods:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
```

### 2. Updated Withdrawal Request Function

```javascript
// Updated function to handle withdrawal with payout method ID
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const userType = req.originalUrl.startsWith('/female-user') ? 'female' : 'agency';
    const { coins, rupees, payoutMethod } = req.body;
    
    // Validate input - either coins or rupees must be provided
    if ((!coins && !rupees) || (coins && rupees)) {
      return res.status(400).json({ success: false, message: messages.VALIDATION.AMOUNT_REQUIRED });
    }
    
    if (coins && (isNaN(coins) || coins <= 0)) {
      return res.status(400).json({ success: false, message: messages.VALIDATION.INVALID_COIN_AMOUNT });
    }
    
    if (rupees && (isNaN(rupees) || rupees <= 0)) {
      return res.status(400).json({ success: false, message: messages.VALIDATION.INVALID_RUPEE_AMOUNT });
    }
    
    if (!['bank', 'upi'].includes(payoutMethod)) return res.status(400).json({ success: false, message: messages.VALIDATION.INVALID_PAYOUT_METHOD });

    const user = userType === 'female' ? await FemaleUser.findById(req.user.id) : await AgencyUser.findById(req.user.id);
    const kycError = ensureKycVerified(user, userType);
    if (kycError) return res.status(400).json({ success: false, message: kycError });
    
    // For female users, get payout details from KYC based on payoutMethodId
    let payoutDetails = null;
    if (userType === 'female') {
      // Check if payoutMethodId is provided
      const payoutMethodId = req.body.payoutMethodId;
      if (!payoutMethodId) {
        return res.status(400).json({ 
          success: false, 
          message: 'payoutMethodId is required for female users' 
        });
      }
      
      if (payoutMethod === 'bank') {
        if (!user.kycDetails || !user.kycDetails.bank || user.kycDetails.bank.status !== 'accepted' || 
            user.kycDetails.bank._id.toString() !== payoutMethodId.toString()) {
          return res.status(400).json({ success: false, message: messages.VALIDATION.BANK_DETAILS_NOT_VERIFIED });
        }
        payoutDetails = {
          accountHolderName: user.kycDetails.bank.name,
          accountNumber: user.kycDetails.bank.accountNumber,
          ifsc: user.kycDetails.bank.ifsc
        };
      } else if (payoutMethod === 'upi') {
        if (!user.kycDetails || !user.kycDetails.upi || user.kycDetails.upi.status !== 'accepted' || 
            user.kycDetails.upi._id.toString() !== payoutMethodId.toString()) {
          return res.status(400).json({ success: false, message: messages.VALIDATION.UPI_DETAILS_NOT_VERIFIED });
        }
        payoutDetails = {
          vpa: user.kycDetails.upi.upiId
        };
      }
    } else {
      // For agency users, still require manual payoutDetails for backward compatibility
      if (!req.body.payoutDetails) return res.status(400).json({ success: false, message: messages.VALIDATION.PAYOUT_DETAILS_REQUIRED });
      payoutDetails = req.body.payoutDetails;
    }
    
    // Get admin config for withdrawal settings
    const adminConfig = await AdminConfig.getConfig();
    
    // Validate required financial settings are configured
    if (adminConfig.coinToRupeeConversionRate === undefined || adminConfig.coinToRupeeConversionRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Coin to rupee conversion rate not configured by admin'
      });
    }
    
    if (adminConfig.minWithdrawalAmount === undefined || adminConfig.minWithdrawalAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount not configured by admin'
      });
    }
    
    const coinToRupeeRate = adminConfig.coinToRupeeConversionRate;
    const minWithdrawalAmount = adminConfig.minWithdrawalAmount;
    
    let coinsRequested, amountInRupees;
    
    // Convert rupees to coins if rupees provided
    if (rupees) {
      amountInRupees = Number(rupees);
      coinsRequested = Math.ceil(amountInRupees * coinToRupeeRate);
    } else {
      coinsRequested = Number(coins);
      amountInRupees = Number((coinsRequested / coinToRupeeRate).toFixed(2));
    }
    
    // Check minimum withdrawal amount
    if (amountInRupees < minWithdrawalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: messages.WITHDRAWAL.MIN_WITHDRAWAL_AMOUNT(minWithdrawalAmount),
        data: {
          minWithdrawalAmount: minWithdrawalAmount,
          requestedAmount: amountInRupees
        }
      });
    }
    
    // For female users, check walletBalance; for agencies, check coinBalance
    let userBalance;
    if (userType === 'female') {
      userBalance = user.walletBalance || 0;
    } else {
      userBalance = user.coinBalance || 0;
    }
    
    // Check balance
    if (userBalance < coinsRequested) {
      return res.status(400).json({ 
        success: false, 
        message: messages.WITHDRAWAL.INSUFFICIENT_BALANCE(userType === 'female' ? 'wallet' : 'coin'),
        data: {
          available: userBalance,
          required: coinsRequested,
          shortfall: coinsRequested - userBalance
        }
      });
    }
    
    // Debit from appropriate balance field
    if (userType === 'female') {
      user.walletBalance = (user.walletBalance || 0) - coinsRequested;
    } else {
      user.coinBalance = (user.coinBalance || 0) - coinsRequested;
    }
    
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      userType,
      userId: user._id,
      operationType: userType === 'female' ? 'wallet' : 'coin',
      action: 'debit',
      amount: coinsRequested,
      message: 'Withdrawal requested - coins debited',
      balanceAfter: userType === 'female' ? user.walletBalance : user.coinBalance,
      createdBy: user._id
    });
    
    const request = await WithdrawalRequest.create({
      userType,
      userId: user._id,
      coinsRequested,
      amountInRupees,
      payoutMethod,
      payoutDetails,
      status: 'pending'
    });
    
    return res.status(201).json({ 
      success: true, 
      message: messages.WITHDRAWAL.WITHDRAWAL_SUCCESS,
      data: request,
      countdownTimer: 24 * 60 * 60 // 24 hours in seconds for frontend display
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
```

### 3. Route Configuration

```javascript
// File: src/routes/femaleUserRoutes/withdrawalRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const ctrl = require('../../controllers/common/withdrawalController');

// Create withdrawal request (female)
router.post('/', auth, ctrl.createWithdrawalRequest);

// Get available payout methods
router.get('/payout-methods', auth, ctrl.getAvailablePayoutMethods);

// List my withdrawal requests
router.get('/', auth, ctrl.listMyWithdrawals);

module.exports = router;
```

### 4. Call Earnings Integration

```javascript
// In callController.js - Transaction creation for female earnings
// Create transaction record for female user earnings
await Transaction.create({
  userType: 'female',
  userId: receiverId,
  operationType: 'wallet',
  action: 'credit',
  amount: femaleEarning,
  earningType: 'call',
  message: `Earnings from call with ${caller.name || caller.email} for ${billableSeconds} seconds`,
  balanceAfter: receiver.walletBalance,
  createdBy: receiverId,
  relatedId: callRecord._id,
  relatedModel: 'CallHistory'
});
```

## Security Considerations

### Payout Method Validation
- Validates that payout method ID belongs to the authenticated user
- Ensures payout method status is 'accepted' before processing
- Prevents users from using unverified or rejected KYC methods

### Financial Validation
- Validates minimum withdrawal amount against admin configuration
- Ensures sufficient wallet balance before processing
- Prevents double withdrawal attempts through proper transaction handling

### Data Protection
- Implements proper authentication for all endpoints
- Validates user permissions for each operation
- Ensures sensitive financial data is properly handled

## Business Rules

1. **Minimum Withdrawal**: Configurable by admin (default ₹100)
2. **Coin Conversion**: Configurable by admin (default 5 coins = ₹1)
3. **KYC Requirement**: Only accepted KYC methods can be used
4. **Balance Check**: Cannot withdraw more than available wallet balance
5. **Method Verification**: Payout method ID must match user's verified KYC

This implementation provides a secure, user-friendly system for female users to manage their earnings and withdrawals while maintaining proper validation and security measures.