# Balance API – Testing Guide

## Base URL
BASE_URL

---

## 1. BALANCE ENDPOINTS

### 1.1 Get User Balance (Female)
```
GET /female-user/me/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletBalance": {
      "coins": 1933.33,
      "rupees": 386.67
    },
    "coinBalance": {
      "coins": 0,
      "rupees": 0
    },
    "conversionRate": {
      "coinsPerRupee": 5
    }
  }
}
```

### 1.2 Get User Balance (Agency)
```
GET /agency/me/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletBalance": {
      "coins": 2200,
      "rupees": 440
    },
    "coinBalance": {
      "coins": 0,
      "rupees": 0
    },
    "conversionRate": {
      "coinsPerRupee": 5
    }
  }
}
```

---

## 2. RESPONSE FIELDS

### 2.1 walletBalance
- `coins`: Available wallet balance in coins (source of truth)
- `rupees`: Calculated real money value (coins / conversion rate)

### 2.2 coinBalance  
- `coins`: Available coin balance in coins (for male users)
- `rupees`: Calculated real money value (coins / conversion rate)

### 2.3 conversionRate
- `coinsPerRupee`: Current conversion rate from admin config
- Used to calculate rupee values dynamically

---

## 3. BUSINESS LOGIC

### 3.1 Coin Storage (Source of Truth)
- **Female users**: Store balance in `walletBalance` field
- **Agency users**: Store balance in `walletBalance` field  
- **Male users**: Store balance in `coinBalance` field
- **Never store rupees in database** - always calculate on-the-fly

### 3.2 Rupee Calculation
```
rupees = coins / coinToRupeeConversionRate
```

### 3.3 Dynamic Conversion
- Uses current `coinToRupeeConversionRate` from AdminConfig
- If rate changes, rupee values update automatically
- Maintains historical accuracy

---

## 4. IMPLEMENTATION DETAILS

### 4.1 Female User Balance
- Fetches `walletBalance` from FemaleUser model
- Calculates rupees using admin conversion rate
- Returns both coin and rupee values

### 4.2 Agency User Balance
- Fetches `walletBalance` from AgencyUser model
- Calculates rupees using admin conversion rate
- Returns both coin and rupee values

### 4.3 Admin Configuration Dependency
- Requires `coinToRupeeConversionRate` to be configured
- If not configured, returns error: "Coin to rupee conversion rate not configured by admin"

---

## 5. TESTING SCENARIOS

### 5.1 Happy Path (Female User)
1. User has walletBalance of 1933.33 coins
2. Admin config has conversion rate of 5
3. API returns: 1933.33 coins = ₹386.67

### 5.2 Happy Path (Agency User)  
1. User has walletBalance of 2200 coins
2. Admin config has conversion rate of 5
3. API returns: 2200 coins = ₹440

### 5.3 Admin Config Not Set
1. Admin has not configured conversion rate
2. API returns error: "Coin to rupee conversion rate not configured by admin"

### 5.4 Zero Balance
1. User has 0 coins in walletBalance
2. API returns: 0 coins = ₹0

---

## 6. UI INTEGRATION

### 6.1 Display Available Coins
- Show `walletBalance.coins` value
- Example: "Available Coins: 1933.33"

### 6.2 Display Cash Value
- Show `walletBalance.rupees` value  
- Example: "Cash to Redeem: ₹386.67"

### 6.3 Conversion Rate Info
- Show current conversion rate to user
- Example: "1 coin = ₹0.20" (based on 5 coins per rupee)

---

## 7. SECURITY & VALIDATION

### 7.1 Authentication
- Requires valid JWT token
- Validates user identity

### 7.2 Authorization
- Requires `requireReviewAccepted` middleware
- Only approved users can access balance

### 7.3 Data Validation
- Validates admin configuration exists
- Ensures user exists in database
- Calculates precise rupee values with 2 decimal places

---

## 8. ERROR HANDLING

### 8.1 Admin Config Error
```json
{
  "success": false,
  "message": "Coin to rupee conversion rate not configured by admin"
}
```

### 8.2 User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 8.3 Server Error
```json
{
  "success": false,
  "error": "Error message details"
}
```

---

## 9. PERFORMANCE CONSIDERATIONS

- Single database query for user data
- Single database query for admin config
- No complex calculations
- Fast response times

---

## 10. BUSINESS RULES

✅ **Coins are source of truth** - Never store rupees in user schema
✅ **Dynamic conversion** - Always use current admin conversion rate
✅ **No data duplication** - Calculate rupees on-the-fly only
✅ **Historical accuracy** - Changes to conversion rate affect all users immediately
✅ **Consistent design** - Same logic for female and agency users