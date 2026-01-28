# Agency System - Complete Documentation

## Table of Contents
1. [Agency Models/Schemas](#agency-modelsschemas)
2. [Agency Routes](#agency-routes)
3. [Agency Controllers](#agency-controllers)
4. [Referral Bonus System](#referral-bonus-system)
5. [Commission System](#commission-system)

---

## Agency Models/Schemas

### 1. AgencyUser Model
```javascript
// src/models/agency/AgencyUser.js
const mongoose = require('mongoose');

const agencyUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  agencyName: { type: String, required: true },
  agencyLicenseNumber: { type: String },
  gstNumber: { type: String },
  panCard: { type: String },
  aadharCard: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branch: String
  },
  documents: [{
    type: { type: String, enum: ['license', 'gst', 'pan', 'aadhar', 'bank'] },
    url: String,
    verified: { type: Boolean, default: false }
  }],
  profileImage: { type: String },
  referralCode: { type: String, unique: true },
  totalReferredUsers: { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 40 }, // Percentage of platform margin
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'suspended'], 
    default: 'pending' 
  },
  reviewStatus: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  kyc: {
    status: { type: String, enum: ['pending', 'submitted', 'verified', 'rejected'], default: 'pending' },
    submittedAt: Date,
    verifiedAt: Date,
    rejectedReason: String
  }
}, { 
  timestamps: true 
});

// Indexes for performance
agencyUserSchema.index({ email: 1 });
agencyUserSchema.index({ referralCode: 1 });
agencyUserSchema.index({ status: 1 });

module.exports = mongoose.model('AgencyUser', agencyUserSchema);
```

### 2. KYC Model
```javascript
// src/models/agency/KYC.js
const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  agencyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AgencyUser', 
    required: true,
    unique: true
  },
  documents: [{
    type: { 
      type: String, 
      enum: ['aadhar_front', 'aadhar_back', 'pan_card', 'bank_statement', 'business_license'],
      required: true
    },
    imageUrl: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    rejectedReason: String
  }],
  status: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  rejectedAt: Date,
  rejectedReason: String
}, {
  timestamps: true
});

module.exports = mongoose.model('AgencyKYC', kycSchema);
```

### 3. Image Model
```javascript
// src/models/agency/Image.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  agencyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AgencyUser',
    required: true
  },
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true }, // Cloudinary public ID
  uploadedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('AgencyImage', imageSchema);
```

---

## Agency Routes

### 1. Main Agency Routes
```javascript
// src/routes/agencyRoutes/agencyUserRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const controller = require('../../controllers/agencyControllers/agencyUserController');

// Authentication
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/logout', auth, controller.logout);
router.post('/refresh-token', controller.refreshToken);

// Profile Management
router.get('/me', auth, controller.getProfile);
router.put('/profile', auth, controller.updateProfile);
router.post('/change-password', auth, controller.changePassword);

// Referral System
router.get('/referral-stats', auth, controller.getReferralStats);
router.get('/referral-code', auth, controller.generateReferralCode);

module.exports = router;
```

### 2. KYC Routes
```javascript
// src/routes/agencyRoutes/kycRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/agencyControllers/kycController');

router.post('/submit', auth, controller.submitKYC);
router.get('/status', auth, controller.getKYCStatus);
router.put('/document/:docType', auth, controller.updateDocument);

module.exports = router;
```

### 3. Earnings Routes
```javascript
// src/routes/agencyRoutes/earningsRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const earningsController = require('../../controllers/agencyControllers/agencyEarningsController');

// Get earnings for referred females - POST method (enhanced security)
router.post('/', auth, requireReviewAccepted, earningsController.getAgencyEarnings);

module.exports = router;
```

### 4. Agency User Management Routes
```javascript
// src/routes/agencyRoutes/agencyUserRoutes.js (Additional)
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/agencyControllers/agencyUserController');

// User Management for Agency
router.get('/users', auth, controller.getReferredUsers);
router.get('/users/:userId', auth, controller.getReferredUserDetails);
router.put('/users/:userId/status', auth, controller.updateUserStatus);

// Commission Tracking
router.get('/commissions', auth, controller.getCommissionHistory);
router.get('/commission-summary', auth, controller.getCommissionSummary);

module.exports = router;

---

## Agency Controllers

### 1. Agency User Controller
```javascript
// src/controllers/agencyControllers/agencyUserController.js
const AgencyUser = require('../../models/agency/AgencyUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const generateToken = require('../../utils/generateToken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Register new agency
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, agencyName } = req.body;
    
    // Check if agency already exists
    const existingAgency = await AgencyUser.findOne({ email });
    if (existingAgency) {
      return res.status(400).json({
        success: false,
        message: 'Agency with this email already exists'
      });
    }
    
    // Generate referral code
    const referralCode = `AG${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // Create new agency
    const agency = new AgencyUser({
      firstName,
      lastName,
      email,
      mobile,
      password: await bcrypt.hash(password, 12),
      agencyName,
      referralCode
    });
    
    await agency.save();
    
    const token = generateToken(agency._id, 'agency');
    
    res.status(201).json({
      success: true,
      message: 'Agency registered successfully',
      token,
      data: {
        agency: {
          id: agency._id,
          firstName: agency.firstName,
          lastName: agency.lastName,
          email: agency.email,
          agencyName: agency.agencyName,
          referralCode: agency.referralCode
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Login agency
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const agency = await AgencyUser.findOne({ email }).select('+password');
    if (!agency) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isMatch = await bcrypt.compare(password, agency.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const token = generateToken(agency._id, 'agency');
    
    res.json({
      success: true,
      token,
      data: {
        agency: {
          id: agency._id,
          firstName: agency.firstName,
          lastName: agency.lastName,
          email: agency.email,
          agencyName: agency.agencyName,
          status: agency.status,
          reviewStatus: agency.reviewStatus
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get agency profile
exports.getProfile = async (req, res) => {
  try {
    const agency = await AgencyUser.findById(req.user._id)
      .select('-password');
    
    res.json({
      success: true,
      data: { agency }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get referred users
exports.getReferredUsers = async (req, res) => {
  try {
    const agencyId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { referredByAgency: agencyId };
    if (status) query.status = status;
    
    const users = await FemaleUser.find(query)
      .select('_id name email mobile status reviewStatus createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await FemaleUser.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalUsers: total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get referral stats
exports.getReferralStats = async (req, res) => {
  try {
    const agencyId = req.user._id;
    
    const totalReferred = await FemaleUser.countDocuments({
      referredByAgency: agencyId
    });
    
    const activeUsers = await FemaleUser.countDocuments({
      referredByAgency: agencyId,
      status: 'active'
    });
    
    const pendingUsers = await FemaleUser.countDocuments({
      referredByAgency: agencyId,
      reviewStatus: 'pending'
    });
    
    res.json({
      success: true,
      data: {
        totalReferred,
        activeUsers,
        pendingUsers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = exports;
```

### 3. Agency Earnings Controller
```javascript
// src/controllers/agencyControllers/agencyEarningsController.js
const AgencyUser = require('../../models/agency/AgencyUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const CallHistory = require('../../models/common/CallHistory');

// Agency earnings by referred females - Enhanced response with scores
exports.getAgencyEarnings = async (req, res) => {
  try {
    const agencyId = req.user._id;
    
    // Get body parameters for date filtering (POST method)
    const { filter, startDate, endDate } = req.body;
    
    // Resolve date range based on filter using rolling 7-day windows
    let start, end;
    const now = new Date();
    
    // Helper functions for date normalization
    const startOfDay = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    
    const endOfDay = (date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };
    
    if (filter === 'thisWeek') {
      // Last 7 days INCLUDING today
      end = endOfDay(now);
      start = startOfDay(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
    } else if (filter === 'lastWeek') {
      // 7 days BEFORE thisWeek (7 days before today, not including today)
      const thisWeekStart = startOfDay(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
      
      end = endOfDay(
        new Date(thisWeekStart.getTime() - 1)
      );
      
      start = startOfDay(
        new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
    } else if (filter === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      start = startOfDay(start);
      end = endOfDay(end);
    } else {
      // Default to this week (last 7 days including today)
      end = endOfDay(now);
      start = startOfDay(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
    }
    
    // Get agency-referred females with enhanced data
    const females = await FemaleUser.find({
      referredByAgency: agencyId,
      status: 'active',
      reviewStatus: 'accepted'
    })
    .select('_id name images score dailyScore weeklyScore walletBalance')
    .populate('images', 'imageUrl');
    
    if (females.length === 0) {
      return res.json({
        success: true,
        data: {
          range: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
          results: []
        }
      });
    }
    
    const femaleIds = females.map(f => f._id);
    
    // Aggregate earnings and time per female for the specified period
    const periodEarnings = await CallHistory.aggregate([
      {
        $match: {
          receiverId: { $in: femaleIds },
          createdAt: { $gte: start, $lte: end },
          status: 'completed' // Only completed calls count
        }
      },
      {
        $group: {
          _id: "$receiverId",
          totalCoins: { $sum: "$femaleEarning" },
          totalSeconds: { $sum: "$duration" }
        }
      }
    ]);
    
    // Format response with enhanced data
    const results = females.map(female => {
      const periodStat = periodEarnings.find(e => e._id.toString() === female._id.toString());
      
      // Get first image as profile image
      const profileImage = female.images && female.images.length > 0 
        ? female.images[0].imageUrl 
        : null;
      
      return {
        femaleId: female._id,
        name: female.name || 'Unknown',
        profileImage: profileImage,
        score: female.score || 0,
        dailyScore: female.dailyScore || 0,
        weeklyScore: female.weeklyScore || 0,
        earnings: periodStat ? Math.round(periodStat.totalCoins * 100) / 100 : 0,
        time: periodStat ? Number((periodStat.totalSeconds / 3600).toFixed(1)) : 0,
        walletBalance: female.walletBalance || 0
      };
    });
    
    // Format date range for response
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    return res.json({
      success: true,
      data: {
        range: `${formatDate(start)} to ${formatDate(end)}`,
        results: results
      }
    });
    
  } catch (err) {
    console.error('Error getting agency earnings:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = exports;
```

---

## Referral Bonus System

### How Agencies Get Referral Bonuses

Agencies earn referral bonuses when female users register using their referral codes.

#### Referral Process Flow:
1. **Agency generates referral code** during registration
2. **Female user registers** using agency's referral code
3. **System validates referral** and assigns agency to user
4. **Bonus is credited** to agency's account

#### Implementation:
```javascript
// In Female User Registration Controller
const processReferralBonus = async (userId, referralCode) => {
  try {
    // Find agency by referral code
    const agency = await AgencyUser.findOne({ referralCode });
    if (!agency) return;
    
    // Update female user with agency reference
    await FemaleUser.findByIdAndUpdate(userId, {
      referredByAgency: agency._id
    });
    
    // Update agency stats
    await AgencyUser.findByIdAndUpdate(agency._id, {
      $inc: {
        totalReferredUsers: 1,
        totalCommissionEarned: 100 // Referral bonus amount
      }
    });
    
    // Create transaction record
    await Transaction.create({
      userId: agency._id,
      userType: 'agency',
      amount: 100,
      type: 'credit',
      description: `Referral bonus for user ${userId}`,
      source: 'referral_bonus'
    });
    
  } catch (err) {
    console.error('Error processing referral bonus:', err);
  }
};
```

#### Referral Bonus Structure:
- **Fixed Amount**: ₹100 per successful referral
- **Conditions**: Female user must complete KYC and first call
- **Tracking**: Automatic via system logs

---

## Commission System

### How Agencies Earn Commissions

Agencies earn commissions from calls made by their referred female users.

#### Commission Calculation Logic:
```javascript
// In Call End Controller
const calculateAgencyCommission = async (callData) => {
  try {
    const { receiverId, platformMargin } = callData;
    
    // Check if female user belongs to agency
    const female = await FemaleUser.findById(receiverId);
    if (!female.referredByAgency) return;
    
    // Get agency commission rate
    const agency = await AgencyUser.findById(female.referredByAgency);
    const commissionRate = agency.commissionRate || 40; // Default 40%
    
    // Calculate commission amount
    const commissionAmount = Math.round(platformMargin * (commissionRate / 100));
    
    // Update agency earnings
    await AgencyUser.findByIdAndUpdate(female.referredByAgency, {
      $inc: { totalCommissionEarned: commissionAmount }
    });
    
    // Create commission transaction
    await Transaction.create({
      userId: female.referredByAgency,
      userType: 'agency',
      amount: commissionAmount,
      type: 'credit',
      description: `Commission from call by ${receiverId}`,
      source: 'commission',
      referenceId: callData._id
    });
    
    return commissionAmount;
  } catch (err) {
    console.error('Error calculating agency commission:', err);
  }
};
```

#### Commission Structure:
- **Rate**: 40% of platform margin (configurable per agency)
- **Calculation**: Based on actual call duration and platform margin
- **Distribution**: Real-time during call settlement
- **Tracking**: Detailed transaction logs for transparency

#### Example Commission Calculation:
```
Call Duration: 10 minutes (600 seconds)
Female Rate: 2 coins/second = 1200 coins
Platform Margin: 1 coin/second = 600 coins
Agency Commission (40%): 240 coins
Admin Share (60%): 360 coins
```

#### Commission Features:
1. **Real-time Processing**: Commissions calculated instantly on call completion
2. **Accurate Tracking**: Detailed logs for audit purposes
3. **Flexible Rates**: Configurable commission percentages per agency
4. **Transparent Reporting**: Clear breakdown in agency dashboard
```javascript
// src/controllers/agencyControllers/kycController.js
const KYC = require('../../models/agency/KYC');
const cloudinary = require('../../config/cloudinary');

// Submit KYC documents
exports.submitKYC = async (req, res) => {
  try {
    const agencyId = req.user._id;
    const { documents } = req.body;
    
    // Check if KYC already exists
    let kyc = await KYC.findOne({ agencyId });
    
    if (kyc) {
      // Update existing KYC
      kyc.documents = documents;
      kyc.status = 'submitted';
      kyc.submittedAt = Date.now();
    } else {
      // Create new KYC
      kyc = new KYC({
        agencyId,
        documents,
        status: 'submitted',
        submittedAt: Date.now()
      });
    }
    
    await kyc.save();
    
    res.json({
      success: true,
      message: 'KYC documents submitted successfully',
      data: { kyc }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get KYC status
exports.getKYCStatus = async (req, res) => {
  try {
    const agencyId = req.user._id;
    
    const kyc = await KYC.findOne({ agencyId });
    
    if (!kyc) {
      return res.json({
        success: true,
        data: { status: 'not_submitted' }
      });
    }
    
    res.json({
      success: true,
      data: {
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        verifiedAt: kyc.verifiedAt,
        rejectedReason: kyc.rejectedReason
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = exports;