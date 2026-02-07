const express = require('express');
const router = express.Router();
const maleUserController = require('../../controllers/maleUserControllers/maleUserController');
const followingFollowersController = require('../../controllers/maleUserControllers/followingFollowersController');
const blockListController = require('../../controllers/maleUserControllers/blockListController');
const callController = require('../../controllers/maleUserControllers/callController');
const auth = require('../../middlewares/authMiddleware');
const { parser } = require('../../config/multer');
const Transaction = require('../../models/common/Transaction');
const { getInterests } = require('../../controllers/common/interestController');
const { getLanguages } = require('../../controllers/common/languageController');
const { preventBlockedInteraction } = require('../../middlewares/blockMiddleware');

// Apply block middleware to all routes except block/unblock
router.use(preventBlockedInteraction);

// Public routes for interests and languages
router.get('/interests', getInterests);
router.get('/languages', getLanguages);

// Register Male User
router.post('/register', maleUserController.registerUser);

// Login Male User (Send OTP)
router.post('/login', maleUserController.loginUser);

// Get my transactions (male) with optional filters
router.get('/me/transactions', auth, async (req, res) => {
  try {
    const { operationType, startDate, endDate } = req.query;
    const filter = { userType: 'male', userId: req.user._id };
    if (operationType && ['wallet', 'coin'].includes(operationType)) filter.operationType = operationType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }
    const txns = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get package purchase history
router.get('/me/transactions/packages', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { 
      userType: 'male', 
      userId: req.user._id,
      operationType: 'coin',
      $or: [
        { message: { $regex: 'Coin Balance Added!!!!', $options: 'i' } },
        { message: { $regex: 'Coin recharge via Razorpay', $options: 'i' } }
      ]
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
    
    const txns = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get call history
router.get('/me/transactions/calls', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { 
      userType: 'male', 
      userId: req.user._id,
      operationType: 'coin',
      message: { $regex: 'Video/Audio call with', $options: 'i' }
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
    
    const txns = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get gift history
router.get('/me/transactions/gifts', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { 
      userType: 'male', 
      userId: req.user._id,
      operationType: 'coin',
      message: { $regex: 'Gift sent', $options: 'i' }
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
    
    const txns = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Login OTP
router.post('/verify-login-otp', maleUserController.verifyLoginOtp);

// Verify OTP and activate user
router.post('/verify-otp', maleUserController.verifyOtp);

// Get user profile
router.get('/me', auth, maleUserController.getUserProfile);

// Update user interests
router.patch('/interests', auth, parser.none(), maleUserController.updateInterests);

// Update user languages
router.patch('/languages', auth, parser.none(), maleUserController.updateLanguages);

// Update user hobbies
router.patch('/hobbies', auth, parser.none(), maleUserController.updateHobbies);

// Update user sports
router.patch('/sports', auth, parser.none(), maleUserController.updateSports);

// Update user film preferences
router.patch('/film', auth, parser.none(), maleUserController.updateFilm);

// Update user music preferences
router.patch('/music', auth, parser.none(), maleUserController.updateMusic);

// Update user travel preferences
router.patch('/travel', auth, parser.none(), maleUserController.updateTravel);

// Update basic profile details
router.patch('/profile-details', auth, parser.none(), maleUserController.updateProfileDetails);

// Update user profile and upload image in single request
router.post('/profile-and-image', auth, parser.array('images', 5), maleUserController.updateProfileAndImage);

// Delete specific preference item
router.delete('/preferences/:type/:itemId', auth, maleUserController.deletePreferenceItem);

// Delete specific interest
router.delete('/interests/:interestId', auth, maleUserController.deleteInterest);

// Delete specific language
router.delete('/languages/:languageId', auth, maleUserController.deleteLanguage);

// Browse female users (paginated)
router.get('/browse-females', auth, maleUserController.listFemaleUsers);

// Upload Images via form-data (field: images)
router.post('/upload-image', auth, parser.array('images', 5), maleUserController.uploadImage);

// Delete image by id
router.delete('/images/:imageId', auth, maleUserController.deleteImage);

// Send Follow Request to Female User
router.post('/follow-request/send', auth, followingFollowersController.sendFollowRequest);

// Cancel Sent Follow Request
router.post('/follow-request/cancel', auth, followingFollowersController.cancelFollowRequest);

// Get Sent Follow Requests
router.get('/follow-requests/sent', auth, followingFollowersController.getSentFollowRequests);

// Follow Female User (used internally when a follow request is accepted)
router.post('/follow', auth, followingFollowersController.followUser);

// Unfollow Female User
router.post('/unfollow', auth, followingFollowersController.unfollowUser);

// Get Following List
router.get('/following', auth, followingFollowersController.getMaleFollowingList);

// Get Followers List
router.get('/followers', auth, followingFollowersController.getMaleFollowersList);

// Buy Coins Package - DEPRECATED: Use /payment/coin/order + /payment/verify instead
// router.post('/buy-coins', auth, maleUserController.buyCoins);

// Blocklist Routes
router.post('/block', auth, blockListController.blockUser);
router.post('/unblock', auth, blockListController.unblockUser);
router.get('/block-list', auth, blockListController.getBlockList);

// Call Routes
router.post('/calls/start', auth, callController.startCall);
router.post('/calls/end', auth, callController.endCall);
router.get('/calls/active', auth, callController.getActiveCall);
router.get('/calls/history', auth, callController.getCallHistory);
router.get('/calls/stats', auth, callController.getCallStats);

// Payment Routes are now handled directly in app.js

// Dashboard Routes
const dashboardRoutes = require('./dashboardRoutes');
router.use('/', dashboardRoutes);

module.exports = router;