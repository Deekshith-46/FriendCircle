# Admin Earnings from Male User Purchases - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Models](#models)
4. [Controllers](#controllers)
5. [API Endpoints](#api-endpoints)
6. [Payment Flow](#payment-flow)
7. [Earnings Calculation](#earnings-calculation)
8. [Admin Dashboard Integration](#admin-dashboard-integration)

## Overview
This system tracks and manages admin earnings generated from male user coin package purchases. The system includes payment processing, transaction recording, admin earning calculation, and comprehensive reporting.

## System Architecture

### Core Components
1. **Payment Processing**: Handles Razorpay integration and payment verification
2. **Transaction Management**: Records all financial transactions
3. **Admin Earning Tracking**: Calculates and stores platform earnings
4. **Reporting System**: Provides earnings summaries and detailed reports

### Data Flow
```
Male User Purchase → Payment Processing → Transaction Creation → Admin Earning Record → Reporting
```

## Models

### AdminEarning Model
**File:** `src/models/admin/AdminEarning.js`

```javascript
const mongoose = require('mongoose');

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
  fromUserModel: { 
    type: String, 
    enum: ['MaleUser', 'FemaleUser', 'AgencyUser'], 
    required: true 
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'fromUserModel'
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
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  }
}, { timestamps: true });

// Indexes for efficient querying
adminEarningSchema.index({ source: 1, createdAt: -1 });
adminEarningSchema.index({ fromUserId: 1, createdAt: -1 });
adminEarningSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminEarning', adminEarningSchema);
```

### Package Model
**File:** `src/models/admin/Package.js`

```javascript
const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  coin: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
```

### Transaction Model
**File:** `src/models/common/Transaction.js`

```javascript
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ['male', 'female', 'agency', 'admin'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    enum: ['MaleUser', 'FemaleUser', 'AgencyUser', 'AdminUser'],
    required: true
  },
  operationType: {
    type: String,
    enum: ['wallet', 'coin'],
    required: true
  },
  action: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  earningType: {
    type: String,
    enum: ['call', 'gift', 'package', 'withdrawal']
  },
  message: {
    type: String,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'manual']
  },
  orderId: {
    type: String
  },
  paymentId: {
    type: String
  },
  signature: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  adminEarningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminEarning'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  relatedModel: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, { timestamps: true });

// Indexes for efficient querying
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userType: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
```

## Controllers

### Payment Controller (Male User)
**File:** `src/controllers/maleUserControllers/paymentController.js`

```javascript
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../../models/common/Transaction');
const AdminEarning = require('../../models/admin/AdminEarning');
const Package = require('../../models/admin/Package');
const MaleUser = require('../../models/maleUser/MaleUser');
const AdminConfig = require('../../models/admin/AdminConfig');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create coin order
exports.createCoinOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user._id;

    // Validate package
    const package = await Package.findById(packageId);
    if (!package || !package.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive package'
      });
    }

    // Create Razorpay order
    const options = {
      amount: package.amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        packageId: packageId.toString(),
        coins: package.coin
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending transaction
    const transaction = await Transaction.create({
      userType: 'male',
      userId: userId,
      userModel: 'MaleUser',
      operationType: 'coin',
      action: 'credit',
      amount: package.coin,
      message: `Coin recharge via Razorpay - Order: ${order.id}`,
      balanceAfter: 0, // Will be updated after verification
      paymentGateway: 'razorpay',
      orderId: order.id,
      status: 'PENDING',
      createdBy: userId
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: package.amount,
        currency: 'INR',
        packageName: package.name,
        coins: package.coin,
        transactionId: transaction._id
      }
    });

  } catch (err) {
    console.error('Error creating coin order:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    console.log('🔥 VERIFY PAYMENT API HIT 🔥', req.body);
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Find pending transaction
    const transaction = await Transaction.findOne({
      orderId: razorpay_order_id,
      userId: userId,
      status: 'PENDING'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or already processed'
      });
    }

    // Get package details from order notes
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const packageId = order.notes.packageId;
    const coins = parseInt(order.notes.coins);

    // Get package
    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Get admin config for earning percentage
    const adminConfig = await AdminConfig.getConfig();
    const adminEarningPercentage = adminConfig.adminEarningPercentage || 15; // Default 15%
    
    // Calculate earnings
    const adminEarningAmount = Number((package.amount * adminEarningPercentage / 100).toFixed(2));
    const actualUserAmount = package.amount - adminEarningAmount;

    // Update user balance
    const user = await MaleUser.findById(userId);
    const oldBalance = user.coinBalance || 0;
    user.coinBalance = oldBalance + coins;
    await user.save();

    // Update transaction
    transaction.status = 'SUCCESS';
    transaction.paymentId = razorpay_payment_id;
    transaction.signature = razorpay_signature;
    transaction.balanceAfter = user.coinBalance;
    await transaction.save();

    // Create admin earning record
    const adminEarning = await AdminEarning.create({
      source: 'PACKAGE_PURCHASE',
      amount: adminEarningAmount,
      fromUserType: 'male',
      fromUserModel: 'MaleUser',
      fromUserId: userId,
      packageId: package._id,
      transactionId: transaction._id,
      metadata: {
        packageAmount: package.amount,
        coinsReceived: coins,
        adminEarningPercentage: adminEarningPercentage,
        actualUserAmount: actualUserAmount
      },
      status: 'SUCCESS'
    });

    // Update transaction with admin earning reference
    transaction.adminEarningId = adminEarning._id;
    await transaction.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        transactionId: transaction._id,
        coinsAdded: coins,
        newBalance: user.coinBalance,
        adminEarning: adminEarningAmount,
        packageAmount: package.amount
      }
    });

  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    const skip = (page - 1) * limit;
    const filter = {
      userId: userId,
      userType: 'male',
      operationType: 'coin',
      action: 'credit'
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }

    const transactions = await Transaction.find(filter)
      .populate('packageId', 'name amount coin')
      .populate('adminEarningId', 'amount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
```

### Admin Earnings Controller
**File:** `src/controllers/adminControllers/adminEarningsController.js`

```javascript
const AdminEarning = require('../../models/admin/AdminEarning');
const Transaction = require('../../models/common/Transaction');
const MaleUser = require('../../models/maleUser/MaleUser');
const Package = require('../../models/admin/Package');

// Get admin earnings summary
exports.getEarningsSummary = async (req, res) => {
  try {
    // Calculate total earnings
    const totalEarnings = await AdminEarning.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get earnings by source
    const earningsBySource = await AdminEarning.aggregate([
      {
        $group: {
          _id: '$source',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalEarnings: totalEarnings[0]?.total || 0,
        earningsBySource
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get detailed earnings history with pagination
exports.getEarningsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, source, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (source) {
      query.source = source;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        query.createdAt.$lte = inclusiveEnd;
      }
    }

    const earnings = await AdminEarning.find(query)
      .populate('fromUserId', 'firstName lastName email')
      .populate('packageId', 'name amount coin')
      .populate('transactionId', 'paymentId orderId status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminEarning.countDocuments(query);

    res.json({
      success: true,
      data: earnings.map(earning => ({
        id: earning._id,
        source: earning.source,
        amount: earning.amount,
        fromUser: earning.fromUserId ? {
          id: earning.fromUserId._id,
          name: `${earning.fromUserId.firstName} ${earning.fromUserId.lastName}`,
          email: earning.fromUserId.email
        } : null,
        transaction: earning.transactionId ? {
          id: earning.transactionId._id,
          paymentId: earning.transactionId.paymentId,
          orderId: earning.transactionId.orderId,
          status: earning.transactionId.status
        } : null,
        package: earning.packageId ? {
          id: earning.packageId._id,
          name: earning.packageId.name,
          amount: earning.packageId.amount,
          coins: earning.packageId.coin
        } : null,
        metadata: earning.metadata,
        date: earning.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get earnings by date range
exports.getEarningsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate) matchQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      matchQuery.createdAt = matchQuery.createdAt || {};
      matchQuery.createdAt.$lte = new Date(endDate);
    }

    const earningsByDate = await AdminEarning.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: earningsByDate.map(item => ({
        date: item._id,
        total: item.total,
        count: item.count
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get top earning users
exports.getTopEarningUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await AdminEarning.aggregate([
      {
        $match: {
          fromUserType: 'male',
          source: 'PACKAGE_PURCHASE'
        }
      },
      {
        $group: {
          _id: '$fromUserId',
          userType: { $first: '$fromUserType' },
          totalEarnings: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalEarnings: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Populate user details
    const populatedUsers = await Promise.all(
      topUsers.map(async (user) => {
        const userDetails = await MaleUser.findById(user._id).select('firstName lastName email');
        return {
          ...user,
          userDetails: userDetails ? {
            id: userDetails._id,
            name: `${userDetails.firstName} ${userDetails.lastName}`,
            email: userDetails.email
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: populatedUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get package purchase statistics
exports.getPackagePurchaseStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = { source: 'PACKAGE_PURCHASE' };
    if (startDate) matchQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      matchQuery.createdAt = matchQuery.createdAt || {};
      matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await AdminEarning.aggregate([
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: 'packages',
          localField: 'packageId',
          foreignField: '_id',
          as: 'packageInfo'
        }
      },
      {
        $unwind: '$packageInfo'
      },
      {
        $group: {
          _id: '$packageId',
          packageName: { $first: '$packageInfo.name' },
          packageAmount: { $first: '$packageInfo.amount' },
          packageCoins: { $first: '$packageInfo.coin' },
          totalEarnings: { $sum: '$amount' },
          purchaseCount: { $sum: 1 },
          totalRevenue: { 
            $sum: {
              $multiply: ['$packageInfo.amount', '$metadata.adminEarningPercentage']
            }
          }
        }
      },
      {
        $sort: { purchaseCount: -1 }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
```

## API Endpoints

### Male User Payment Endpoints

#### POST /male-user/payment/coin/order
Create a coin package order for payment processing.

**Request Body:**
```json
{
  "packageId": "package_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_Rzp123456789",
    "amount": 100,
    "currency": "INR",
    "packageName": "Basic Package",
    "coins": 300,
    "transactionId": "transaction_id"
  }
}
```

#### POST /male-user/payment/verify
Verify Razorpay payment and complete the transaction.

**Request Body:**
```json
{
  "razorpay_order_id": "order_Rzp123456789",
  "razorpay_payment_id": "pay_Rzp987654321",
  "razorpay_signature": "signature_hash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "transactionId": "transaction_id",
    "coinsAdded": 300,
    "newBalance": 1500,
    "adminEarning": 15,
    "packageAmount": 100
  }
}
```

#### GET /male-user/payment/history
Get payment history for the logged-in male user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "transaction_id",
      "amount": 300,
      "message": "Coin recharge via Razorpay - Order: order_Rzp123456789",
      "status": "SUCCESS",
      "paymentId": "pay_Rzp987654321",
      "orderId": "order_Rzp123456789",
      "packageId": {
        "_id": "package_id",
        "name": "Basic Package",
        "amount": 100,
        "coin": 300
      },
      "adminEarningId": {
        "amount": 15
      },
      "createdAt": "timestamp"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalResults": 50
  }
}
```

### Admin Earnings Endpoints

#### GET /admin/earnings/summary
Get overall admin earnings summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": 1340,
    "earningsBySource": [
      {
        "_id": "PACKAGE_PURCHASE",
        "total": 1340,
        "count": 10
      }
    ]
  }
}
```

#### GET /admin/earnings/history
Get detailed earnings history with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `source` (optional): Filter by source (PACKAGE_PURCHASE, CALL_EARNING, etc.)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "earning_id",
      "source": "PACKAGE_PURCHASE",
      "amount": 15,
      "fromUser": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "transaction": {
        "id": "transaction_id",
        "paymentId": "pay_Rzp987654321",
        "orderId": "order_Rzp123456789",
        "status": "SUCCESS"
      },
      "package": {
        "id": "package_id",
        "name": "Basic Package",
        "amount": 100,
        "coins": 300
      },
      "metadata": {
        "packageAmount": 100,
        "coinsReceived": 300,
        "adminEarningPercentage": 15,
        "actualUserAmount": 85
      },
      "date": "timestamp"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalResults": 25
  }
}
```

#### GET /admin/earnings/by-date
Get earnings grouped by date.

**Query Parameters:**
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-06",
      "total": 450,
      "count": 3
    },
    {
      "date": "2026-02-05",
      "total": 320,
      "count": 2
    }
  ]
}
```

#### GET /admin/earnings/top-users
Get top earning users.

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_id",
      "userType": "male",
      "totalEarnings": 150,
      "transactionCount": 5,
      "userDetails": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

#### GET /admin/earnings/package-stats
Get package purchase statistics.

**Query Parameters:**
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "package_id",
      "packageName": "Basic Package",
      "packageAmount": 100,
      "packageCoins": 300,
      "totalEarnings": 150,
      "purchaseCount": 10,
      "totalRevenue": 1000
    }
  ]
}
```

## Payment Flow

### Complete Payment Process

1. **Package Selection**
   - Male user selects a coin package
   - Frontend sends packageId to `/male-user/payment/coin/order`

2. **Order Creation**
   - Backend creates Razorpay order
   - Creates pending transaction record
   - Returns order details to frontend

3. **Payment Processing**
   - Frontend opens Razorpay checkout
   - User completes payment
   - Razorpay returns payment details

4. **Payment Verification**
   - Frontend sends payment details to `/male-user/payment/verify`
   - Backend verifies Razorpay signature
   - Calculates admin earnings
   - Updates user balance
   - Creates admin earning record
   - Updates transaction status

5. **Completion**
   - Returns success response with updated balances
   - Admin earning is recorded for reporting

### Earnings Calculation Formula

```
Package Amount: ₹100
Admin Earning Percentage: 15%
Admin Earning: ₹100 × 0.15 = ₹15
User Receives: ₹100 - ₹15 = ₹85 worth of service
Coins Credited: 300 coins
```

## Admin Dashboard Integration

### Dashboard Components

#### Earnings Summary Widget
```javascript
// Fetch and display earnings summary
async function loadEarningsSummary() {
  try {
    const response = await fetch('/admin/earnings/summary', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    if (result.success) {
      document.getElementById('totalEarnings').textContent = `₹${result.data.totalEarnings}`;
      
      const sourceList = document.getElementById('earningsBySource');
      sourceList.innerHTML = result.data.earningsBySource
        .map(source => `
          <div class="source-item">
            <span>${source._id}</span>
            <span>₹${source.total} (${source.count} transactions)</span>
          </div>
        `).join('');
    }
  } catch (error) {
    console.error('Error loading earnings summary:', error);
  }
}
```

#### Earnings History Table
```javascript
// Load earnings history with filters
async function loadEarningsHistory(page = 1, filters = {}) {
  try {
    const queryParams = new URLSearchParams({
      page: page,
      limit: 20,
      ...filters
    });
    
    const response = await fetch(`/admin/earnings/history?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    if (result.success) {
      renderEarningsTable(result.data);
      renderPagination(result.pagination);
    }
  } catch (error) {
    console.error('Error loading earnings history:', error);
  }
}

function renderEarningsTable(earnings) {
  const tableBody = document.getElementById('earningsTableBody');
  tableBody.innerHTML = earnings.map(earning => `
    <tr>
      <td>${earning.date}</td>
      <td>${earning.source}</td>
      <td>${earning.fromUser?.name || 'Unknown'}</td>
      <td>${earning.package?.name || 'N/A'}</td>
      <td>₹${earning.amount}</td>
      <td>
        <span class="status ${earning.transaction?.status?.toLowerCase()}">
          ${earning.transaction?.status || 'N/A'}
        </span>
      </td>
      <td>
        <button onclick="viewEarningDetails('${earning.id}')">View</button>
      </td>
    </tr>
  `).join('');
}
```

#### Date Range Analytics
```javascript
// Load earnings by date range
async function loadEarningsByDate(startDate, endDate) {
  try {
    const response = await fetch(`/admin/earnings/by-date?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    if (result.success) {
      renderEarningsChart(result.data);
    }
  } catch (error) {
    console.error('Error loading earnings by date:', error);
  }
}

function renderEarningsChart(data) {
  // Using Chart.js or similar library
  const ctx = document.getElementById('earningsChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(item => item.date),
      datasets: [{
        label: 'Daily Earnings',
        data: data.map(item => item.total),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
```

### Security & Validation

#### Authentication
- All admin endpoints require valid JWT authentication
- Role-based access control for admin users
- Proper authorization checks for sensitive operations

#### Data Validation
- Package ID validation
- Payment signature verification
- Amount and percentage validation
- User ownership verification

#### Error Handling
- Proper error responses with meaningful messages
- Logging of failed transactions
- Graceful handling of edge cases

This comprehensive system provides a robust foundation for tracking and managing admin earnings from male user purchases, with complete payment processing, transaction management, and detailed reporting capabilities.