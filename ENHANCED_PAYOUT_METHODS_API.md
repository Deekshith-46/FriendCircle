# Enhanced Payout Methods API Documentation

## API Endpoint
```
GET /female-user/withdrawals/payout-methods
Authorization: Bearer <token>
```

## New Response Structure

The API now returns both payout methods AND wallet/coin balance information in a single response:

```json
{
  "success": true,
  "data": {
    "walletBalance": {
      "coins": 0,
      "rupees": 0
    },
    "coinBalance": {
      "coins": 0,
      "rupees": 0
    },
    "conversionRate": {
      "coinsPerRupee": 2,
      "rupeesPerCoin": 0.5
    },
    "payoutMethods": {
      "bank": {
        "id": "ObjectId",
        "accountNumber": "123456789012",
        "ifsc": "IFSC0000",
        "status": "pending"
      },
      "upi": {
        "id": "ObjectId",
        "upiId": "user@ybl",
        "status": "pending"
      }
    }
  }
}
```

## Benefits

1. **Single API Call**: Get both balance information and payout methods in one request
2. **Reduced Network Requests**: No need to call `/female-user/me/coins-and-rupees` separately
3. **Consistent Data**: All financial information comes from the same source
4. **Better User Experience**: Faster loading times for withdrawal screens

## Migration Guide

### Previous Implementation (2 separate calls):
```javascript
// Call 1: Get balance info
const balanceResponse = await fetch('/female-user/me/coins-and-rupees', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Call 2: Get payout methods
const payoutResponse = await fetch('/female-user/withdrawals/payout-methods', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Combine data manually
const walletBalance = balanceResponse.data.walletBalance;
const payoutMethods = payoutResponse.data;
```

### New Implementation (1 call):
```javascript
// Single call gets all data
const response = await fetch('/female-user/withdrawals/payout-methods', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Access all data from single response
const walletBalance = response.data.walletBalance;
const coinBalance = response.data.coinBalance;
const conversionRate = response.data.conversionRate;
const payoutMethods = response.data.payoutMethods;
```

## Response Fields

### Balance Information
- `walletBalance.coins`: User's wallet balance in coins
- `walletBalance.rupees`: User's wallet balance converted to rupees
- `coinBalance.coins`: User's coin balance (if applicable)
- `coinBalance.rupees`: User's coin balance converted to rupees
- `conversionRate.coinsPerRupee`: How many coins equal 1 rupee
- `conversionRate.rupeesPerCoin`: How many rupees equal 1 coin

### Payout Methods
- `payoutMethods.bank`: Bank account details (if available)
- `payoutMethods.upi`: UPI details (if available)
- Each method includes `id`, `status`, and method-specific details

## Error Handling

The API will return appropriate error responses:
- `401`: Invalid or missing authentication token
- `404`: User not found
- `400`: Missing admin configuration for conversion rates
- `500`: Server error

## Example Usage

```javascript
async function loadWithdrawalData() {
  try {
    const response = await fetch('/female-user/withdrawals/payout-methods', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI with all financial data
      updateBalanceDisplay(result.data.walletBalance);
      updatePayoutMethods(result.data.payoutMethods);
      updateConversionInfo(result.data.conversionRate);
    } else {
      showError(result.message || 'Failed to load withdrawal data');
    }
  } catch (error) {
    console.error('Error loading withdrawal data:', error);
    showError('Network error occurred');
  }
}
```

## Backend Changes

The enhancement was implemented by modifying the `getAvailablePayoutMethods` function in `src/controllers/common/withdrawalController.js` to include balance calculation logic from the existing `getBalanceInfo` function.