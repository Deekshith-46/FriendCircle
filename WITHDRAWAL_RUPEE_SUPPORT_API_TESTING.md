# Withdrawal with Rupee Support – Testing Guide

## Base URL
BASE_URL

---

## 1. WITHDRAWAL ENDPOINTS

### 1.1 Create Withdrawal Request (Female User)
```
POST /female-user/withdrawals
```

**Request (using rupees):**
```json
{
  "rupees": 500,
  "payoutMethod": "bank",
  "payoutMethodId": "69579889293f6506c0d5ddea"
}
```

**Request (using coins - advanced):**
```json
{
  "coins": 2500,
  "payoutMethod": "bank", 
  "payoutMethodId": "69579889293f6506c0d5ddea"
}
```

### 1.2 Create Withdrawal Request (Agency User)
```
POST /agency/withdrawals
```

**Request (using rupees):**
```json
{
  "rupees": 300,
  "payoutMethod": "upi",
  "payoutMethodId": "69579893293f6506c0d5ddf0"
}
```

---

## 2. REQUEST FIELDS

### 2.1 Required Fields
- `payoutMethod`: "bank" or "upi"
- `payoutMethodId`: ID of the KYC method to use
- Either `rupees` OR `coins` (not both)

### 2.2 Primary Input (Recommended)
- `rupees`: Amount in rupees (user-friendly)
- Example: `"rupees": 500`

### 2.3 Advanced Input
- `coins`: Amount in coins (for advanced users)
- Example: `"coins": 2500`

---

## 3. BUSINESS LOGIC

### 3.1 Conversion from Rupees
```
coinsRequested = Math.ceil(rupees * coinToRupeeConversionRate)
```

### 3.2 Conversion from Coins
```
amountInRupees = coins / coinToRupeeConversionRate
```

### 3.3 Validation Flow
1. User provides either `rupees` OR `coins`
2. Backend validates the provided amount
3. Converts to appropriate coin amount for processing
4. Validates against minimum withdrawal amount (in rupees)
5. Checks user balance (in coins)
6. Processes withdrawal in coins (source of truth)

---

## 4. IMPLEMENTATION DETAILS

### 4.1 Rupee-to-Coin Conversion
- Uses `Math.ceil()` to ensure sufficient coins are deducted
- Prevents fractional coin issues
- Maintains user experience while preserving coin accuracy

### 4.2 Example Conversion
```
Conversion rate: 5 coins per rupee
User enters: "rupees": 500
Backend calculates: 500 × 5 = 2500 coins
Backend deducts: 2500 coins from walletBalance
```

### 4.3 Minimum Withdrawal Check
- Always validated in rupees (₹100 minimum)
- User-friendly validation
- Matches real-world expectations

---

## 5. TESTING SCENARIOS

### 5.1 Happy Path (Rupees Input - Female User)
1. User has walletBalance of 2500 coins (₹500 at rate 5)
2. User enters: `{"rupees": 200, "payoutMethod": "bank", "payoutMethodId": "..."}`  
3. Backend converts: 200 × 5 = 1000 coins
4. Deducts 1000 coins from wallet
5. Creates withdrawal request for ₹200

### 5.2 Happy Path (Rupees Input - Agency User)
1. User has walletBalance of 3000 coins (₹600 at rate 5)
2. User enters: `{"rupees": 300, "payoutMethod": "upi", "payoutMethodId": "..."}`  
3. Backend converts: 300 × 5 = 1500 coins
4. Deducts 1500 coins from wallet
5. Creates withdrawal request for ₹300

### 5.3 Minimum Withdrawal Validation
1. Admin config has minimum withdrawal of ₹100
2. User enters: `{"rupees": 50, ...}` (below minimum)
3. API returns error about minimum amount

### 5.4 Insufficient Balance
1. User has ₹300 worth of coins (1500 coins at rate 5)
2. User enters: `{"rupees": 400, ...}` (needs 2000 coins)
3. API returns "Insufficient coin balance"

---

## 6. UI INTEGRATION

### 6.1 Display Available Balance
- Show both coins and rupees using balance API
- Example: "Available: 1933.33 coins (₹386.66)"

### 6.2 User Input Field
- Primary input: Rupees field (user-friendly)
- Label: "Enter amount to withdraw (₹)"
- Validation: Check against minimum withdrawal amount

### 6.3 Backend Processing
- Send rupees value in request body
- Backend handles conversion automatically
- No frontend math required

---

## 7. SECURITY & VALIDATION

### 7.1 Input Validation
- Only one of `coins` or `rupees` allowed
- Both values must be positive numbers
- Invalid combinations rejected

### 7.2 Authentication
- Requires valid JWT token
- Validates user identity

### 7.3 KYC Validation
- Validates payout method exists in user's KYC
- Checks KYC status is accepted
- Ensures payoutMethodId matches user's KYC

---

## 8. ERROR HANDLING

### 8.1 Invalid Input Combination
```json
{
  "success": false,
  "message": "Please provide either coins or rupees, not both"
}
```

### 8.2 Missing Required Fields
```json
{
  "success": false,
  "message": "Amount (coins or rupees), payoutMethod, and payoutMethodId are required"
}
```

### 8.3 Minimum Withdrawal Error
```json
{
  "success": false,
  "message": "Minimum withdrawal amount is ₹100",
  "data": {
    "minWithdrawalAmount": 100,
    "requestedAmount": 50
  }
}
```

---

## 9. PERFORMANCE CONSIDERATIONS

- Single conversion calculation per request
- No complex operations
- Fast response times
- Efficient coin-to-rupee conversion using admin config

---

## 10. BUSINESS RULES

✅ **User-friendly input**: Users enter rupees, not coins
✅ **Coins as source of truth**: All processing happens in coins internally  
✅ **No rounding loss**: Uses `Math.ceil()` for rupee-to-coin conversion
✅ **Validation in rupees**: Minimum amount checked in rupees
✅ **Backward compatibility**: Still supports direct coin input
✅ **Consistent experience**: Same logic for female and agency users

---

## 11. EXAMPLE WORKFLOW

### User Action:
- Sees "Cash To Redeem: ₹386.66"
- Enters "Withdraw ₹300"

### Backend Processing:
```
Input: {"rupees": 300, ...}
Conversion: 300 × 5 = 1500 coins
Validation: 1500 coins ≤ user wallet balance
Deduction: walletBalance - 1500 coins
Storage: withdrawal request for ₹300
```

### Result:
- User balance reduced by 1500 coins
- Withdrawal created for ₹300
- UI shows correct remaining balance

This perfectly matches real-world fintech applications!