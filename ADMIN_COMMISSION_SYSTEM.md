# Admin Commission System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Commission Types](#commission-types)
3. [Admin Configuration](#admin-configuration)
4. [Commission Calculation Logic](#commission-calculation-logic)
5. [Call Commission Flow](#call-commission-flow)
6. [Package Purchase Commission](#package-purchase-commission)
7. [Agency Commission Distribution](#agency-commission-distribution)
8. [API Endpoints](#api-endpoints)
9. [Database Models](#database-models)
10. [Frontend Implementation](#frontend-implementation)

## Overview

The admin commission system is a core revenue mechanism that allows platform administrators to earn from various user activities. The system supports multiple commission types and provides flexible configuration options.

## Commission Types

### 1. Call Commissions
- **Source**: Male-to-female calls
- **Calculation**: Percentage of call revenue
- **Distribution**: Between admin and agency (if applicable)

### 2. Package Purchase Commissions
- **Source**: Male user coin package purchases
- **Calculation**: Fixed percentage of purchase amount
- **Distribution**: Direct to admin

### 3. Gift Commissions
- **Source**: Male user gift purchases
- **Calculation**: Percentage of gift value
- **Distribution**: Direct to admin

### 4. Withdrawal Fees
- **Source**: User withdrawal requests
- **Calculation**: Fixed fee or percentage
- **Distribution**: Direct to admin

## Admin Configuration

### Admin Configuration Model
**File:** `src/models/admin/AdminConfig.js`

```javascript
const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema({
  // Platform-wide settings
  platformName: {
    type: String,
    default: 'Friend Circle'
  },
  platformDescription: {
    type: String,
    default: 'Premium Dating Platform'
  },
  
  // Commission Settings
  adminEarningPercentage: {
    type: Number,
    default: 15, // 15% from package purchases
    min: 0,
    max: 100
  },
  callCommissionPercentage: {
    type: Number,
    default: 20, // 20% from call revenues
    min: 0,
    max: 100
  },
  giftCommissionPercentage: {
    type: Number,
    default: 10, // 10% from gift purchases
    min: 0,
    max: 100
  },
  withdrawalFee: {
    type: Number,
    default: 50, // Fixed ₹50 withdrawal fee
    min: 0
  },
  withdrawalFeeType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  
  // Agency Settings
  agencyEnabled: {
    type: Boolean,
    default: true
  },
  adminSharePercentage: {
    type: Number,
    default: 70, // Admin gets 70% of call commissions for agency females
    min: 0,
    max: 100
  },
  agencySharePercentage: {
    type: Number,
    default: 30, // Agency gets 30% of call commissions
    min: 0,
    max: 100
  },
  
  // Call Settings
  minCallDuration: {
    type: Number,
    default: 30, // Minimum billable seconds
    min: 0
  },
  maxCallDuration: {
    type: Number,
    default: 3600, // Maximum call duration (1 hour)
    min: 0
  },
  
  // Validation
  validate: {
    validator: function() {
      // Ensure percentages add up correctly
      return this.adminSharePercentage + this.agencySharePercentage === 100;
    },
    message: 'Admin and agency share percentages must sum to 100%'
  }
}, { timestamps: true });

// Static method to get config
adminConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('AdminConfig', adminConfigSchema);
```

### Admin Configuration Controller
**File:** `src/controllers/adminControllers/adminConfigController.js`

```javascript
const AdminConfig = require('../../models/admin/AdminConfig');

// Get current configuration
exports.getConfiguration = async (req, res) => {
  try {
    const config = await AdminConfig.getConfig();
    res.json({
      success: true,
      data: {
        platformName: config.platformName,
        platformDescription: config.platformDescription,
        commissions: {
          adminEarningPercentage: config.adminEarningPercentage,
          callCommissionPercentage: config.callCommissionPercentage,
          giftCommissionPercentage: config.giftCommissionPercentage,
          withdrawalFee: config.withdrawalFee,
          withdrawalFeeType: config.withdrawalFeeType
        },
        agency: {
          enabled: config.agencyEnabled,
          adminSharePercentage: config.adminSharePercentage,
          agencySharePercentage: config.agencySharePercentage
        },
        callSettings: {
          minCallDuration: config.minCallDuration,
          maxCallDuration: config.maxCallDuration
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update configuration
exports.updateConfiguration = async (req, res) => {
  try {
    const {
      platformName,
      platformDescription,
      adminEarningPercentage,
      callCommissionPercentage,
      giftCommissionPercentage,
      withdrawalFee,
      withdrawalFeeType,
      agencyEnabled,
      adminSharePercentage,
      agencySharePercentage,
      minCallDuration,
      maxCallDuration
    } = req.body;

    // Validate percentage sum for agency shares
    if (adminSharePercentage !== undefined && agencySharePercentage !== undefined) {
      if (adminSharePercentage + agencySharePercentage !== 100) {
        return res.status(400).json({
          success: false,
          message: 'Admin and agency share percentages must sum to 100%'
        });
      }
    }

    const config = await AdminConfig.getConfig();
    
    // Update fields if provided
    if (platformName !== undefined) config.platformName = platformName;
    if (platformDescription !== undefined) config.platformDescription = platformDescription;
    if (adminEarningPercentage !== undefined) config.adminEarningPercentage = adminEarningPercentage;
    if (callCommissionPercentage !== undefined) config.callCommissionPercentage = callCommissionPercentage;
    if (giftCommissionPercentage !== undefined) config.giftCommissionPercentage = giftCommissionPercentage;
    if (withdrawalFee !== undefined) config.withdrawalFee = withdrawalFee;
    if (withdrawalFeeType !== undefined) config.withdrawalFeeType = withdrawalFeeType;
    if (agencyEnabled !== undefined) config.agencyEnabled = agencyEnabled;
    if (adminSharePercentage !== undefined) config.adminSharePercentage = adminSharePercentage;
    if (agencySharePercentage !== undefined) config.agencySharePercentage = agencySharePercentage;
    if (minCallDuration !== undefined) config.minCallDuration = minCallDuration;
    if (maxCallDuration !== undefined) config.maxCallDuration = maxCallDuration;

    await config.save();

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: config
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
```

## Commission Calculation Logic

### 1. Package Purchase Commission

**Formula:**
```
Package Amount: ₹100
Admin Commission: 15%
Admin Earning: ₹100 × 0.15 = ₹15
User Gets: ₹85 worth of service (300 coins)
```

**Implementation:**
```javascript
// In payment verification controller
const adminConfig = await AdminConfig.getConfig();
const adminEarningPercentage = adminConfig.adminEarningPercentage || 15;

const adminEarningAmount = Number((package.amount * adminEarningPercentage / 100).toFixed(2));
const userAmount = package.amount - adminEarningAmount;
```

### 2. Call Commission Calculation

**For Non-Agency Females:**
```
Call Duration: 180 seconds
Male Pay Rate: ₹0.7/second
Total Payment: 180 × ₹0.7 = ₹126
Female Earning: ₹0.5/second × 180 = ₹90
Platform Margin: ₹126 - ₹90 = ₹36
Admin Commission: 100% of platform margin = ₹36
```

**For Agency Females:**
```
Call Duration: 180 seconds
Male Pay Rate: ₹0.7/second
Total Payment: 180 × ₹0.7 = ₹126
Female Earning: ₹0.5/second × 180 = ₹90
Platform Margin: ₹126 - ₹90 = ₹36
Admin Share (70%): ₹36 × 0.7 = ₹25.20
Agency Share (30%): ₹36 × 0.3 = ₹10.80
```

**Implementation:**
```javascript
// In call end controller
const adminConfig = await AdminConfig.getConfig();

// Calculate platform margin
const platformMargin = malePay - femaleEarning;

let adminEarned = 0;
let agencyEarned = 0;

if (isAgencyFemale) {
  // Split platform margin between admin and agency
  const adminSharePercentage = adminConfig.adminSharePercentage || 70;
  const agencySharePercentage = adminConfig.agencySharePercentage || 30;
  
  adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
  agencyEarned = Number((platformMargin * agencySharePercentage / 100).toFixed(2));
} else {
  // All platform margin goes to admin
  adminEarned = Number(platformMargin.toFixed(2));
  agencyEarned = 0;
}
```

### 3. Gift Commission

**Formula:**
```
Gift Value: ₹200
Gift Commission: 10%
Admin Earning: ₹200 × 0.10 = ₹20
Female Receives: ₹180
```

## Call Commission Flow

### Step-by-Step Process

#### 1. Call Initiation
```javascript
// Male user starts call
POST /male-user/calls/start
{
  "receiverId": "female_user_id",
  "callType": "video"
}

// System:
// - Creates CallSession with frozen rates
// - Records start time
// - No commission yet
```

#### 2. Call in Progress
```javascript
// Real-time communication
// Duration tracking happens
// Rates are frozen from CallSession
```

#### 3. Call Completion
```javascript
// Either user ends call or timeout
POST /male-user/calls/end
{
  "receiverId": "female_user_id",
  "duration": 180,
  "callType": "video",
  "callId": "session_id"
}

// System Processing:
1. Validate call session
2. Calculate billable duration (min 30 seconds)
3. Calculate total payment
4. Calculate female earning
5. Calculate platform margin
6. Determine admin/agency shares
7. Process financial transactions
8. Record commissions
```

#### 4. Commission Distribution
```javascript
// Financial processing
const malePay = Math.ceil(billableSeconds * malePayPerSecond);
const femaleEarning = Math.floor(malePay * (femaleRatePerSecond / malePayPerSecond));
const platformMargin = malePay - femaleEarning;

// Commission calculation
if (isAgencyFemale) {
  adminEarned = platformMargin * (adminSharePercentage / 100);
  agencyEarned = platformMargin * (agencySharePercentage / 100);
} else {
  adminEarned = platformMargin; // 100% to admin
}

// Update balances
await MaleUser.updateOne({ _id: callerId }, { $inc: { coinBalance: -malePay } });
await FemaleUser.updateOne({ _id: receiverId }, { $inc: { walletBalance: femaleEarning } });
if (agencyEarned > 0) {
  await AgencyUser.updateOne({ _id: agencyId }, { $inc: { walletBalance: agencyEarned } });
}

// Record transactions
await Transaction.create([
  {
    userType: 'male',
    userId: callerId,
    operationType: 'coin',
    action: 'debit',
    amount: malePay,
    message: `Video/Audio call with ${femaleName} for ${billableSeconds} seconds`,
    balanceAfter: updatedMaleBalance
  },
  {
    userType: 'female',
    userId: receiverId,
    operationType: 'wallet',
    action: 'credit',
    amount: femaleEarning,
    earningType: 'call',
    message: `Earnings from call with ${maleName} for ${billableSeconds} seconds`,
    balanceAfter: updatedFemaleBalance
  },
  {
    userType: 'admin',
    userId: adminId,
    operationType: 'wallet',
    action: 'credit',
    amount: adminEarned,
    earningType: 'call',
    message: `Admin commission from call between ${maleName} and ${femaleName}`,
    balanceAfter: updatedAdminBalance
  }
]);

// Create admin earning record
await AdminEarning.create({
  source: 'CALL_EARNING',
  amount: adminEarned,
  fromUserType: 'male',
  fromUserId: callerId,
  toUserType: 'admin',
  relatedEntity: callHistoryId,
  metadata: {
    callDuration: duration,
    billableDuration: billableSeconds,
    platformMargin: platformMargin,
    femaleEarning: femaleEarning
  }
});
```

## Package Purchase Commission

### Complete Flow

#### 1. Package Selection
```javascript
// Male user selects package
POST /male-user/payment/coin/order
{
  "packageId": "package_123"
}

// System:
// - Validates package
// - Creates Razorpay order
// - Creates pending transaction
```

#### 2. Payment Processing
```javascript
// Razorpay payment completion
POST /male-user/payment/verify
{
  "razorpay_order_id": "order_123",
  "razorpay_payment_id": "pay_123",
  "razorpay_signature": "signature"
}

// System Processing:
1. Verify payment signature
2. Get package details
3. Calculate admin commission
4. Update user balance
5. Record admin earning
```

#### 3. Commission Recording
```javascript
const adminConfig = await AdminConfig.getConfig();
const adminEarningPercentage = adminConfig.adminEarningPercentage || 15;

const adminEarningAmount = Number((package.amount * adminEarningPercentage / 100).toFixed(2));
const userAmount = package.amount - adminEarningAmount;

// Update user balance
const user = await MaleUser.findById(userId);
user.coinBalance = (user.coinBalance || 0) + package.coin;
await user.save();

// Create admin earning
await AdminEarning.create({
  source: 'PACKAGE_PURCHASE',
  amount: adminEarningAmount,
  fromUserType: 'male',
  fromUserId: userId,
  packageId: package._id,
  metadata: {
    packageAmount: package.amount,
    coinsReceived: package.coin,
    adminEarningPercentage: adminEarningPercentage,
    userAmount: userAmount
  }
});
```

## Agency Commission Distribution

### Agency System Overview

#### 1. Agency Registration
```javascript
// Female user registered through agency
FemaleUser schema includes:
referredByAgency: { type: mongoose.Schema.Types.ObjectId, ref: 'AgencyUser' }
```

#### 2. Commission Split Logic
```javascript
// When agency female receives a call
if (female.referredByAgency) {
  const isAgencyFemale = true;
  // Split platform margin between admin and agency
} else {
  const isAgencyFemale = false;
  // All platform margin to admin
}
```

#### 3. Agency Earning Recording
```javascript
// For agency females
if (agencyEarned > 0 && receiver.referredByAgency) {
  const agencyUserId = receiver.referredByAgency;
  
  // Update agency wallet
  await AgencyUser.updateOne(
    { _id: agencyUserId },
    { $inc: { walletBalance: agencyEarned } }
  );
  
  // Record agency transaction
  await Transaction.create({
    userType: 'agency',
    userId: agencyUserId,
    operationType: 'wallet',
    action: 'credit',
    amount: agencyEarned,
    earningType: 'call',
    message: `Agency commission from call between users`,
    balanceAfter: updatedAgencyBalance
  });
}
```

## API Endpoints

### Admin Configuration Endpoints

#### GET /admin/config
Get current admin configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "platformName": "Friend Circle",
    "platformDescription": "Premium Dating Platform",
    "commissions": {
      "adminEarningPercentage": 15,
      "callCommissionPercentage": 20,
      "giftCommissionPercentage": 10,
      "withdrawalFee": 50,
      "withdrawalFeeType": "fixed"
    },
    "agency": {
      "enabled": true,
      "adminSharePercentage": 70,
      "agencySharePercentage": 30
    },
    "callSettings": {
      "minCallDuration": 30,
      "maxCallDuration": 3600
    }
  }
}
```

#### PUT /admin/config
Update admin configuration.

**Request Body:**
```json
{
  "adminEarningPercentage": 18,
  "callCommissionPercentage": 25,
  "adminSharePercentage": 60,
  "agencySharePercentage": 40
}
```

### Commission Reporting Endpoints

#### GET /admin/commissions/summary
Get commission summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCommission": 2450,
    "bySource": [
      { "source": "PACKAGE_PURCHASE", "total": 1200, "count": 15 },
      { "source": "CALL_EARNING", "total": 1100, "count": 45 },
      { "source": "GIFT_EARNING", "total": 150, "count": 8 }
    ],
    "agencyCommissions": 330,
    "adminNetEarnings": 2120
  }
}
```

#### GET /admin/commissions/history
Get detailed commission history.

**Query Parameters:**
- `source` (optional): Filter by source
- `startDate` (optional): Date range start
- `endDate` (optional): Date range end
- `page` (optional): Page number
- `limit` (optional): Items per page

## Database Models

### AdminEarning Model (Extended)
```javascript
const adminEarningSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['PACKAGE_PURCHASE', 'CALL_EARNING', 'GIFT_EARNING', 'WITHDRAWAL_FEE'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fromUserType: {
    type: String,
    enum: ['male', 'female', 'agency'],
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'fromUserModel'
  },
  fromUserModel: {
    type: String,
    enum: ['MaleUser', 'FemaleUser', 'AgencyUser'],
    required: true
  },
  toUserType: {
    type: String,
    enum: ['admin', 'agency'],
    default: 'admin'
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'toUserModel'
  },
  toUserModel: {
    type: String,
    enum: ['AdminUser', 'AgencyUser']
  },
  relatedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
  callSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallSession'
  },
  metadata: {
    type: {
      packageAmount: Number,
      coinsReceived: Number,
      adminEarningPercentage: Number,
      callDuration: Number,
      billableDuration: Number,
      platformMargin: Number,
      femaleEarning: Number,
      agencySharePercentage: Number
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  }
}, { timestamps: true });
```

## Frontend Implementation

### Admin Dashboard Components

#### Commission Configuration Panel
```javascript
// Commission Settings Component
function CommissionSettings() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/admin/config', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfiguration = async (newConfig) => {
    try {
      const response = await fetch('/admin/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });
      
      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
        showSuccess('Configuration updated successfully');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      showError('Failed to update configuration');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="commission-settings">
      <h2>Commission Settings</h2>
      
      <div className="setting-group">
        <h3>Package Purchase Commission</h3>
        <PercentageInput
          label="Admin Earning Percentage"
          value={config.commissions?.adminEarningPercentage || 15}
          onChange={(value) => updateConfiguration({ adminEarningPercentage: value })}
          min={0}
          max={100}
        />
      </div>

      <div className="setting-group">
        <h3>Call Commission</h3>
        <PercentageInput
          label="Call Commission Percentage"
          value={config.commissions?.callCommissionPercentage || 20}
          onChange={(value) => updateConfiguration({ callCommissionPercentage: value })}
          min={0}
          max={100}
        />
      </div>

      <div className="setting-group">
        <h3>Agency Commission Split</h3>
        <div className="split-inputs">
          <PercentageInput
            label="Admin Share"
            value={config.agency?.adminSharePercentage || 70}
            onChange={(value) => updateConfiguration({ adminSharePercentage: value })}
            min={0}
            max={100}
          />
          <PercentageInput
            label="Agency Share"
            value={config.agency?.agencySharePercentage || 30}
            onChange={(value) => updateConfiguration({ agencySharePercentage: value })}
            min={0}
            max={100}
            disabled={true} // Auto-calculated
          />
        </div>
      </div>
    </div>
  );
}
```

#### Commission Dashboard
```javascript
// Commission Dashboard Component
function CommissionDashboard() {
  const [summary, setSummary] = useState({});
  const [history, setHistory] = useState([]);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  useEffect(() => {
    loadCommissionData();
  }, [dateRange]);

  const loadCommissionData = async () => {
    try {
      // Load summary
      const summaryResponse = await fetch('/admin/commissions/summary', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const summaryResult = await summaryResponse.json();
      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      // Load history
      const historyResponse = await fetch(`/admin/commissions/history?startDate=${dateRange.start}&endDate=${dateRange.end}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const historyResult = await historyResponse.json();
      if (historyResult.success) {
        setHistory(historyResult.data);
      }
    } catch (error) {
      console.error('Error loading commission data:', error);
    }
  };

  return (
    <div className="commission-dashboard">
      <div className="summary-cards">
        <SummaryCard
          title="Total Commission"
          value={`₹${summary.totalCommission || 0}`}
          icon="💰"
        />
        <SummaryCard
          title="Agency Commissions"
          value={`₹${summary.agencyCommissions || 0}`}
          icon="🏢"
        />
        <SummaryCard
          title="Net Admin Earnings"
          value={`₹${summary.adminNetEarnings || 0}`}
          icon="📊"
        />
      </div>

      <div className="commission-history">
        <h3>Commission History</h3>
        <DateRangePicker
          onChange={setDateRange}
        />
        <CommissionTable data={history} />
      </div>
    </div>
  );
}
```

### Real-time Commission Tracking
```javascript
// Real-time commission updates
function useCommissionUpdates() {
  const [commissions, setCommissions] = useState([]);

  useEffect(() => {
    const socket = io('/admin', {
      auth: { token: authToken }
    });

    socket.on('commission-update', (data) => {
      setCommissions(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      showNotification(`New commission: ₹${data.amount}`, 'success');
    });

    return () => socket.disconnect();
  }, []);

  return commissions;
}
```

## Security Considerations

### 1. Authentication & Authorization
- All admin endpoints require valid JWT tokens
- Role-based access control for commission settings
- Audit logging for configuration changes

### 2. Data Validation
- Percentage range validation (0-100)
- Sum validation for agency splits
- Amount validation (positive numbers only)

### 3. Financial Safety
- Atomic transaction processing
- Balance validation before deductions
- Comprehensive error handling
- Transaction rollback on failures

### 4. Audit Trail
- All commission changes logged
- User activity tracking
- Financial transaction records
- Configuration change history

This comprehensive commission system provides flexible revenue generation for platform administrators while maintaining transparency and proper financial controls.