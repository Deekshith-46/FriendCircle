# CALL SYSTEM API TESTING GUIDE

This document provides comprehensive step-by-step testing instructions for the call system, covering all critical functionality including call flow, financial calculations, admin revenue tracking, and error handling.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [API Test Cases](#api-test-cases)
4. [Financial Validation Tests](#financial-validation-tests)
5. [Error Handling Tests](#error-handling-tests)
6. [Admin Reports Tests](#admin-reports-tests)
7. [Agency Functionality Tests](#agency-functionality-tests)
8. [Postman Collection](#postman-collection)

## Prerequisites

### Required Accounts
- Admin account with configuration permissions
- Male user account with sufficient coin balance
- Female user account with earning rate set
- Agency user account (optional)

### Required Configurations
- Admin must configure:
  - `marginAgency` (platform margin for agency females)
  - `marginNonAgency` (platform margin for non-agency females) 
  - `adminSharePercentage` (percentage of platform margin for admin)
  - `coinToRupeeConversionRate`
  - `minWithdrawalAmount`

### Test Data Setup
```javascript
// Sample female user earning rate
coinsPerMinute: 120  // Female earns 120 coins per minute (2 coins per second)

// Sample admin configuration
marginAgencyPerMinute: 60      // 60 coins per minute platform margin (1 coin per second)
marginNonAgencyPerMinute: 60   // 60 coins per minute platform margin (1 coin per second)  
adminSharePercentage: 60  // 60% of platform margin goes to admin
```

## Test Environment Setup

### 1. Start the Server
```bash
npm start
# or
npm run dev
```

### 2. Verify Database Connection
- Ensure MongoDB is running
- Verify all collections exist
- Check that test users are created

### 3. Prepare Test Users
Create the following test users:

#### Male User
- Register as male user
- Add sufficient coins (minimum 100+ for testing)
- Verify account status

#### Female User  
- Register as female user
- Set earning rate: `coinsPerSecond = 2`
- Set account as accepted for review
- Verify account status

#### Agency User (Optional)
- Register as agency user
- Set up agency relationships
- Verify account status

## API Test Cases

### Test Case 0: Female User Sets Earning Rate

#### Step 1: Authenticate Female User
```
POST /api/female-user/auth/login
Content-Type: application/json

{
  "email": "female@test.com",
  "password": "password123"
}
```
- **Expected Response**: 200 OK with JWT token
- **Verify**: Token is valid and user is female type

#### Step 2: Update Female User Earning Rate
```
PATCH /api/female-user/earning-rate
Authorization: Bearer <female_user_token>
Content-Type: application/json

{
  "coinsPerMinute": 120
}
```
- **Expected Response**: 200 OK
- **Verify Response**:
  ```json
  {
    "success": true,
    "message": "Earning rate updated successfully",
    "data": {
      "coinsPerMinute": 120
    }
  }
  ```
- **Verify**: Female user's earning rate is set to 120 coins per minute (2 coins per second)

**Alternative with form data:**
```
PATCH /api/female-user/earning-rate
Authorization: Bearer <female_user_token>
Content-Type: multipart/form-data

coinsPerMinute: 120
```
- **Expected Response**: 200 OK

### Test Case 1: Successful Call Flow

#### Step 1: Authenticate Male User
```
POST /api/male-user/auth/login
Content-Type: application/json

{
  "email": "male@test.com",
  "password": "password123"
}
```
- **Expected Response**: 200 OK with JWT token
- **Verify**: Token is valid and user is male type

#### Step 2: Start Call
```
POST /api/male-user/calls/start
Authorization: Bearer <male_user_token>
Content-Type: application/json

{
  "receiverId": "<female_user_id>",
  "callType": "video"
}
```
- **Expected Response**: 200 OK
- **Verify Response**:
  ```json
  {
    "success": true,
    "data": {
      "maxSeconds": 50,
      "femaleEarningPerSecond": 2,
      "platformMarginPerSecond": 1, 
      "malePayPerSecond": 3,
      "callerCoinBalance": 150,
      "isAgencyFemale": false
    }
  }
  ```
- **Verify Calculations**:
  - `maxSeconds = callerCoinBalance / malePayPerSecond`
  - `femaleEarningPerSecond = femaleEarningPerMinute / 60 = 120 / 60 = 2`
  - `platformMarginPerSecond = platformMarginPerMinute / 60 = 60 / 60 = 1`
  - `malePayPerSecond = femaleEarningPerSecond + platformMarginPerSecond`

#### Step 3: End Call Successfully
```
POST /api/male-user/calls/end
Authorization: Bearer <male_user_token>
Content-Type: application/json

{
  "receiverId": "<female_user_id>",
  "duration": 10,
  "callType": "video"
}
```
- **Expected Response**: 200 OK
- **Verify Response**:
  ```json
  {
    "success": true,
    "data": {
      "duration": 10,
      "femaleEarning": 20,
      "platformMargin": 10,
      "totalCoins": 30,
      "coinsDeducted": 30,
      "callerRemainingBalance": 120,
      "receiverNewBalance": 20
    }
  }
  ```
- **Verify Financial Calculations**:
  - `femaleEarning = duration * femaleEarningPerSecond = 10 * 2 = 20`
  - `platformMargin = duration * platformMarginPerSecond = 10 * 1 = 10`
  - `totalCoins = femaleEarning + platformMargin = 20 + 10 = 30`
  - `adminEarned = Math.round(platformMargin * adminSharePercentage / 100) = Math.round(10 * 60 / 100) = 6`
  - `agencyEarned = platformMargin - adminEarned = 10 - 6 = 4` (if agency female)

#### Step 4: Verify Database Updates
- **Male User**: `coinBalance` decreased by `totalCoins`
- **Female User**: `walletBalance` increased by `femaleEarning`
- **CallHistory**: Record created with correct amounts
- **Transactions**: All transaction records created

### Test Case 2: Zero-Duration Call
```
POST /api/male-user/calls/end
Authorization: Bearer <male_user_token>
Content-Type: application/json

{
  "receiverId": "<female_user_id>",
  "duration": 0,
  "callType": "video"
}
```
- **Expected Response**: 200 OK
- **Verify Response**:
  ```json
  {
    "success": true,
    "data": {
      "duration": 0,
      "coinsDeducted": 0,
      "coinsCredited": 0
    }
  }
  ```
- **Verify Database**:
  - No coins deducted from male
  - No coins credited to female
  - `adminEarned = 0`, `agencyEarned = 0`

### Test Case 3: Insufficient Coins Call
```
POST /api/male-user/calls/end
Authorization: Bearer <male_user_token>
Content-Type: application/json

{
  "receiverId": "<female_user_id>",
  "duration": 100,
  "callType": "video"
}
```
- **Expected Response**: 400 Bad Request
- **Verify Response**:
  ```json
  {
    "success": false,
    "message": "Insufficient coins",
    "data": {
      "required": 300,
      "available": 150,
      "shortfall": 150
    }
  }
  ```
- **Verify Database**:
  - No coins deducted from male
  - No coins credited to female
  - `adminEarned = 0`, `agencyEarned = 0`
  - `status: 'insufficient_coins'` in CallHistory

## Financial Validation Tests

### Test 1: Admin Revenue Calculation
**Scenario**: Agency female call with 60% admin share
- **Given**: 
  - Female sets earning rate: 120 coins/min
  - System converts to: 2 coins/sec (120 / 60 = 2, rounded up if needed)
  - Platform margin: 60 coins/min (1 coin/sec)  
  - Admin share: 60%
  - Call duration: 10 seconds
- **Expected**:
  - Female earning: 20 coins (2 coins/sec × 10 sec)
  - Platform margin: 10 coins (1 coin/sec × 10 sec)
  - Admin earned: 6 coins (60% of 10)
  - Agency earned: 4 coins (remaining 40%)

### Test 2: Non-Agency Female Call
**Scenario**: Non-agency female call
- **Given**:
  - Female sets earning rate: 120 coins/min
  - System converts to: 2 coins/sec (120 / 60 = 2, rounded up if needed)
  - Platform margin: 60 coins/min (1 coin/sec)
  - Call duration: 10 seconds
- **Expected**:
  - Female earning: 20 coins (2 coins/sec × 10 sec)
  - Platform margin: 10 coins (1 coin/sec × 10 sec)
  - Admin earned: 10 coins (100% of platform margin)
  - Agency earned: 0 coins

### Test 3: Rounding Integrity
**Scenario**: Platform margin that results in fractional admin share
- **Given**:
  - Platform margin: 11 coins (from per-minute to per-second conversion)
  - Admin share: 60%
- **Expected**:
  - Admin earned: 7 coins (Math.round(11 * 0.6))
  - Agency earned: 4 coins (11 - 7)
  - Total: 11 coins (no loss)

### Test 4: Ledger Balance Check
**Verify**: `platformMargin = adminEarned + agencyEarned`
- **Run after each call**: Ensure no coins are lost in calculation

## Error Handling Tests

### Test 1: Missing Admin Configuration
**Scenario**: Call attempted without admin configuration
```
// First, ensure admin config is missing or null
// Then attempt to start a call
```
- **Expected**: 400 Bad Request with specific error message
- **Verify**: System fails safely, no partial execution

### Test 2: Invalid Duration
```
POST /api/male-user/calls/end
{
  "receiverId": "<female_user_id>",
  "duration": -5
}
```
- **Expected**: 400 Bad Request with duration validation error

### Test 3: User Not Found
```
POST /api/male-user/calls/end
{
  "receiverId": "invalid_user_id",
  "duration": 10
}
```
- **Expected**: 404 Not Found

### Test 4: Unauthorized Access
```
POST /api/male-user/calls/start
// Without Authorization header
```
- **Expected**: 401 Unauthorized

## Admin Reports Tests

### Test 1: Get Admin Earnings Summary
```
GET /api/admin/reports/earnings-summary
Authorization: Bearer <admin_token>
```
- **Verify Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalCalls": 5,
      "totalFemaleEarnings": 100,
      "totalPlatformMargin": 50,
      "totalAdminEarnings": 30,
      "totalAgencyEarnings": 20
    }
  }
  ```
- **Verify**: All totals match database calculations

### Test 2: Get Earnings by Date Range
```
GET /api/admin/reports/earnings-by-date?startDate=2023-01-01&endDate=2023-12-31&groupBy=day
Authorization: Bearer <admin_token>
```
- **Verify**: Returns earnings grouped by specified period
- **Verify**: Data is accurate and properly formatted

### Test 3: Agency Earnings Summary
```
GET /api/admin/reports/agency-earnings
Authorization: Bearer <admin_token>
```
- **Verify**: Returns agency-specific earnings
- **Verify**: Data matches individual call records

## Agency Functionality Tests

### Test 1: Agency Female Call
- **Setup**: Female user belongs to agency
- **Execute**: Complete call flow
- **Verify**: Agency receives commission
- **Verify**: Agency wallet balance increases

### Test 2: Agency Commission Calculation
- **Given**: Platform margin = 10, Admin share = 60%
- **Expected**: Agency gets 40% of platform margin
- **Verify**: Agency transaction record created

### Test 3: Agency Withdrawal
```
POST /api/agency/withdrawals/create
Authorization: Bearer <agency_token>
{
  "coins": 100,
  "payoutMethod": "bank"
}
```
- **Verify**: Coins deducted from agency balance
- **Verify**: Withdrawal request created
- **Verify**: KYC validation enforced

## Postman Collection

### Collection Structure
```
Call System API Tests
├── Authentication
│   ├── Male User Login
│   ├── Female User Login
│   └── Admin Login
├── Call Flow
│   ├── Start Call
│   ├── End Call - Success
│   ├── End Call - Zero Duration
│   └── End Call - Insufficient Coins
├── Financial Validation
│   ├── Agency Call
│   ├── Non-Agency Call
│   └── Rounding Test
├── Admin Reports
│   ├── Earnings Summary
│   ├── Earnings by Date
│   └── Agency Earnings
└── Error Handling
    ├── Missing Config
    ├── Invalid Duration
    └── Unauthorized Access
```

### Environment Variables
```
{
  "baseUrl": "http://localhost:3000/api",
  "maleUserToken": "",
  "femaleUserToken": "",
  "adminToken": "",
  "agencyToken": "",
  "femaleUserId": "",
  "maleUserId": "",
  "agencyUserId": ""
}
```

## Test Execution Checklist

### Before Testing
- [ ] Server is running
- [ ] Database is populated with test users
- [ ] Admin configuration is set
- [ ] All tokens are valid

### During Testing
- [ ] Each API call returns expected status code
- [ ] Financial calculations are correct
- [ ] Database updates are as expected
- [ ] Error handling works properly

### After Testing
- [ ] All transactions are properly recorded
- [ ] CallHistory records are complete
- [ ] User balances are updated correctly
- [ ] Admin reports reflect the transactions

## Expected Results Summary

| Test Scenario | Expected Outcome | Pass Criteria |
|---------------|------------------|---------------|
| Successful call | Coins transferred correctly | Female gets earnings, male pays total |
| Zero-duration call | No coins transferred | All amounts = 0 |
| Insufficient coins | Call fails, no transfers | No balance changes |
| Agency female call | Agency gets commission | Agency balance increases |
| Admin revenue | Properly tracked | Reports show correct amounts |
| Configuration missing | Safe failure | No partial execution |

## Troubleshooting

### Common Issues
1. **Invalid Token Errors**: Regenerate authentication tokens
2. **Configuration Missing**: Ensure admin has set all required parameters (marginAgencyPerMinute, marginNonAgencyPerMinute, adminSharePercentage)
3. **Database Connection**: Verify MongoDB is running
4. **Financial Calculation Discrepancies**: Check rounding logic
5. **Per-minute to Per-second Conversion**: Verify female users have coinsPerMinute set correctly

### Verification Commands
```bash
# Check admin configuration
GET /api/admin/config

# Check user balances
GET /api/male-user/profile
GET /api/female-user/profile

# Check recent calls
GET /api/male-user/calls/history
GET /api/admin/reports/earnings-summary
```

## Automated Testing Script Example

```javascript
// Example test script for call flow
const axios = require('axios');

async function testCallFlow() {
  const maleToken = process.env.MALE_TOKEN;
  const femaleId = process.env.FEMALE_ID;
  
  try {
    // Start call
    const startResponse = await axios.post('/api/male-user/calls/start', {
      receiverId: femaleId
    }, {
      headers: { Authorization: `Bearer ${maleToken}` }
    });
    
    console.log('Start Call:', startResponse.data);
    
    // End call
    const endResponse = await axios.post('/api/male-user/calls/end', {
      receiverId: femaleId,
      duration: 10
    }, {
      headers: { Authorization: `Bearer ${maleToken}` }
    });
    
    console.log('End Call:', endResponse.data);
    
    // Verify financial calculations
    const expectedFemaleEarning = 10 * 2; // duration * earningRate (from 120 coins/min = 2 coins/sec)
    const expectedPlatformMargin = 10 * 1; // duration * margin (from 60 coins/min = 1 coin/sec)
    const expectedTotal = expectedFemaleEarning + expectedPlatformMargin;
    
    console.log('Expected - Female:', expectedFemaleEarning, 
                'Platform:', expectedPlatformMargin, 
                'Total:', expectedTotal);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

## Admin Margin Configuration APIs

Admin users need to set the following call system parameters using these API endpoints:

### 1. Update Agency Female Call Margin
```
POST /api/admin/config/margin-agency
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "marginAgency": 60
}
```
- **Description**: Sets the platform margin for agency female users (in coins per minute)
- **Expected Response**: 200 OK with success message
- **Validation**: Value must be non-negative number

### 2. Update Non-Agency Female Call Margin  
```
POST /api/admin/config/margin-non-agency
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "marginNonAgency": 60
}
```
- **Description**: Sets the platform margin for non-agency female users (in coins per minute)
- **Expected Response**: 200 OK with success message
- **Validation**: Value must be non-negative number

### 3. Update Admin Share Percentage
```
POST /api/admin/config/admin-share-percentage
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "adminSharePercentage": 60
}
```
- **Description**: Sets the percentage of platform margin that goes to admin (for agency females)
- **Expected Response**: 200 OK with success message
- **Validation**: Value must be between 0 and 100 (minimum 10% recommended)

### 4. Update Minimum Call Coins
```
POST /api/admin/config/min-call-coins
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "minCallCoins": 10
}
```
- **Description**: Sets the minimum coins required to start a call
- **Expected Response**: 200 OK with success message
- **Validation**: Value must be non-negative number

### 5. Update Coin to Rupee Conversion Rate
```
POST /api/admin/config/coin-to-rupee-rate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "coinToRupeeConversionRate": 0.01
}
```
- **Description**: Sets the conversion rate from coins to rupees
- **Expected Response**: 200 OK with success message
- **Validation**: Value must be positive number

### 6. Update Minimum Withdrawal Amount
```
POST /api/admin/config/min-withdrawal-amount
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "minWithdrawalAmount": 100
}
```
- **Description**: Sets the minimum amount for withdrawal requests
- **Expected Response**: 200 OK with success message
- **Validation**: Value must be positive number

### 7. Get All Admin Configuration
```
GET /api/admin/config
Authorization: Bearer <admin_token>
```
- **Description**: Retrieves all current admin configuration settings
- **Expected Response**: 200 OK with configuration object
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "marginAgency": 60,
    "marginNonAgency": 60,
    "adminSharePercentage": 60,
    "coinToRupeeConversionRate": 0.01,
    "minWithdrawalAmount": 100,
    "minCallCoins": 10
  }
}
```
// Run test
testCallFlow();
```