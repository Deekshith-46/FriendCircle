# Admin User Management API – Testing Guide

## Base URL
BASE_URL

---

## 1. BALANCE OPERATIONS

### 1.1 Operate User Balance
```
POST /admin/users/operate-balance
```
j
**Request Body:**
```json
{
  "userType": "agency",
  "userId": "69575c03269ba223eac22fd1",
  "operationType": "wallet",
  "action": "credit",
  "amount": 2000,
  "message": "Wallet Balance Added!!"
}
```

**Valid Parameters:**
- `userType`: "male", "female", or "agency"
- `operationType`: "wallet" or "coin"
- `action`: "credit" or "debit"
- `amount`: Positive number

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "walletBalance": 2000,
    "transaction": {
      "_id": "transaction_id",
      "userType": "agency",
      "userId": "user_id",
      "operationType": "wallet",
      "action": "credit",
      "amount": 2000,
      "message": "Wallet Balance Added!!",
      "balanceAfter": 2000,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 2. USER MANAGEMENT

### 2.1 List Users
```
GET /admin/users?type=agency
```

Optional parameters:
- `type`: "male", "female", or "agency" (default: all)

---

### 2.2 Toggle User Status
```
POST /admin/users/toggle-status
```

**Request Body:**
```json
{
  "userType": "agency",
  "userId": "user_id",
  "status": "active" // or "inactive"
}
```

---

### 2.3 Review Registration
```
POST /admin/users/review-registration
```

**Request Body:**
```json
{
  "userType": "agency",
  "userId": "user_id",
  "reviewStatus": "accepted" // or "rejected"
}
```

---

### 2.4 Review KYC
```
POST /admin/users/review-kyc
```

**Request Body:**
```json
{
  "userType": "agency",
  "userId": "user_id",
  "kycType": "bank", // or "upi"
  "reviewStatus": "accepted" // or "rejected"
}
```

---

### 2.5 List Pending Registrations
```
GET /admin/users/pending-registrations
```

---

### 2.6 List Pending KYCs
```
GET /admin/users/pending-kycs
```

---

### 2.7 List User Transactions
```
GET /admin/users/:userType/:userId/transactions
```

**Example:**
```
GET /admin/users/agency/69575c03269ba223eac22fd1/transactions
```

Optional parameters:
- `operationType`: "wallet" or "coin"
- `startDate`: "YYYY-MM-DD"
- `endDate`: "YYYY-MM-DD"

---

### 2.8 Set Female Call Rate
```
POST /admin/users/set-call-rate
```

**Request Body:**
```json
{
  "userId": "female_user_id",
  "coinsPerSecond": 2
}
```

---

## 3. ERROR RESPONSES

### Invalid UserType
```json
{
  "success": false,
  "message": "Invalid userType"
}
```

### Invalid Operation Type
```json
{
  "success": false,
  "message": "Invalid operation type. Must be 'wallet' or 'coin'"
}
```

### Invalid Action
```json
{
  "success": false,
  "message": "Invalid action. Must be 'credit' or 'debit'"
}
```

### Invalid Amount
```json
{
  "success": false,
  "message": "Invalid amount. Must be a positive number"
}
```

### Insufficient Balance
```json
{
  "success": false,
  "message": "Insufficient balance for debit operation"
}
```

### User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## 4. TESTING SCENARIOS

### For Agency Users:

1. **Credit Agency Wallet Balance:**
   ```json
   {
     "userType": "agency",
     "userId": "agency_id",
     "operationType": "wallet",
     "action": "credit",
     "amount": 2000,
     "message": "Wallet Balance Added"
   }
   ```

2. **Debit Agency Wallet Balance:**
   ```json
   {
     "userType": "agency",
     "userId": "agency_id", 
     "operationType": "wallet",
     "action": "debit",
     "amount": 500,
     "message": "Balance Deducted"
   }
   ```

3. **Credit Agency Coin Balance:**
   ```json
   {
     "userType": "agency",
     "userId": "agency_id",
     "operationType": "coin",
     "action": "credit", 
     "amount": 1000,
     "message": "Coin Balance Added"
   }
   ```

4. **List Agency Transactions:**
   ```
   GET /admin/users/agency/agency_id/transactions
   ```

---

## 5. IMPLEMENTATION NOTES

✅ **Agency Support Added**: All user management APIs now support 'agency' userType
✅ **Balance Operations**: Both wallet and coin balance operations work for agencies
✅ **Transaction Tracking**: Proper transaction records created for agency operations
✅ **Consistent Design**: Same API structure for male, female, and agency users
✅ **Validation**: Proper validation for all user types and operations