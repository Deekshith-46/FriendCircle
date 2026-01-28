# Withdrawal & Transaction API – Testing Guide

## Base URL
BASE_URL

---

## 1. FEMALE USER APIs

### 1.1 Get My Transactions
```
GET /female-user/me/transactions?operationType=wallet
```

Optional parameters:
- `operationType` (wallet or coin)
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)

**Example:**
```
GET /female-user/me/transactions?operationType=wallet&startDate=2025-09-29&endDate=2025-09-30
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "transaction_id",
      "userType": "female",
      "userId": "user_id",
      "operationType": "wallet",
      "action": "credit",
      "amount": 100,
      "message": "Earnings from call",
      "balanceAfter": 500,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 1.2 Get Payout Methods
```
GET /female-user/withdrawals/payout-methods
```

**Response:**
```json
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

---

### 1.3 List My Withdrawals
```
GET /female-user/withdrawals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "withdrawal_id",
      "userType": "female",
      "userId": "user_id",
      "coinsRequested": 500,
      "amountInRupees": 100,
      "payoutMethod": "bank",
      "status": "pending",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 1.4 Create Withdrawal
```
POST /female-user/withdrawals
```

**Request Body:**
```json
{
  "coins": 500,
  "payoutMethod": "bank",
  "payoutMethodId": "<bank_kyc_id>"
}
```

**Response:**
```json
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
    "createdAt": "2023-01-01T00:00:00.000Z"
  },
  "countdownTimer": 86400
}
```

---

## 2. AGENCY APIs

### 2.1 Get My Transactions
```
GET /agency/me/transactions?operationType=coin
```

Optional parameters:
- `operationType` (wallet or coin)
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)

**Example:**
```
GET /agency/me/transactions?operationType=coin&startDate=2025-09-29&endDate=2025-09-30
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "transaction_id",
      "userType": "agency",
      "userId": "user_id",
      "operationType": "coin",
      "action": "credit",
      "amount": 200,
      "message": "Commission from call",
      "balanceAfter": 1000,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2.2 Get Payout Methods
```
GET /agency/withdrawals/payout-methods
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bank": {
      "id": "ObjectId",
      "accountNumber": "987654321098",
      "ifsc": "IFSC1234",
      "status": "accepted"
    },
    "upi": {
      "id": "ObjectId",
      "upiId": "agency@ybl",
      "status": "accepted"
    }
  }
}
```

---

### 2.3 List My Withdrawals
```
GET /agency/withdrawals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "withdrawal_id",
      "userType": "agency",
      "userId": "user_id",
      "coinsRequested": 1000,
      "amountInRupees": 200,
      "payoutMethod": "upi",
      "status": "pending",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2.4 Create Withdrawal
```
POST /agency/withdrawals
```

**Request Body:**
```json
{
  "coins": 1000,
  "payoutMethod": "upi",
  "payoutMethodId": "<upi_kyc_id>"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request created successfully. Your payment will be credited in 24 hours.",
  "data": {
    "_id": "withdrawal_id",
    "userType": "agency",
    "userId": "user_id",
    "coinsRequested": 1000,
    "amountInRupees": 200,
    "payoutMethod": "upi",
    "payoutDetails": {
      "vpa": "agency@ybl"
    },
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00.000Z"
  },
  "countdownTimer": 86400
}
```

---

## 3. ADMIN APIs

### 3.1 List Withdrawals
```
GET /admin/withdrawals?status=pending
```

Optional parameters:
- `status` (pending, approved, rejected, processing, completed)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "withdrawal_id",
      "userType": "female",
      "userId": "user_id",
      "coinsRequested": 500,
      "amountInRupees": 100,
      "payoutMethod": "bank",
      "status": "pending",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "userDetails": {
        "name": "Female User",
        "email": "user@example.com",
        "kycStatus": "accepted"
      }
    }
  ]
}
```

---

### 3.2 Approve Withdrawal
```
POST /admin/withdrawals/{id}/approve
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal approved successfully",
  "data": {
    "_id": "withdrawal_id",
    "status": "approved"
  }
}
```

---

### 3.3 Reject Withdrawal
```
POST /admin/withdrawals/{id}/reject
```

**Request Body:**
```json
{
  "reason": "Invalid bank details"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal rejected successfully"
}
```

---

## 4. STATUS FLOW

- `pending` → `approved`
- `pending` → `rejected` → coins refunded

---

## 5. VALIDATIONS

### For Both Female and Agency Users:
- KYC must be accepted
- Minimum withdrawal enforced
- Coins debited on request
- Coins refunded on rejection
- No double deduction
- Payout method ID must match user's verified KYC
- Payout method status must be 'accepted'

### Error Responses:

**Missing payoutMethodId:**
```json
{
  "success": false,
  "message": "payoutMethodId is required for [female/agency] users"
}
```

**Invalid payoutMethodId:**
```json
{
  "success": false,
  "message": "Bank/UPI details not verified"
}
```

**Insufficient balance:**
```json
{
  "success": false,
  "message": "Insufficient [wallet/coin] balance",
  "data": {
    "available": 200,
    "required": 500,
    "shortfall": 300
  }
}
```

**Below minimum:**
```json
{
  "success": false,
  "message": "Minimum withdrawal amount is ₹100",
  "data": {
    "minWithdrawalAmount": 100,
    "requestedAmount": 20
  }
}
```

---

## 6. TESTING SCENARIOS

### Happy Path:
1. User with verified KYC creates withdrawal
2. Admin approves withdrawal
3. User checks transaction history

### Error Path:
1. User without verified KYC tries to withdraw
2. User with rejected KYC tries to withdraw
3. User with insufficient balance tries to withdraw
4. Admin rejects withdrawal and coins are refunded

### Edge Cases:
1. Date range filtering for transactions
2. Multiple concurrent withdrawal requests
3. Admin approval/rejection with proper validation
4. Balance consistency after approval/rejection

---

## 7. IMPLEMENTATION NOTES

✅ **Shared controller**: Both female and agency users use the same withdrawal controller
✅ **KYC-based payout methods**: Both use verified KYC details for payout methods
✅ **Generic transaction model**: Same transaction table for both user types
✅ **Admin approval logic**: Handles both female (wallet) and agency (coin) balances
✅ **Symmetric API design**: Female and agency APIs follow identical patterns