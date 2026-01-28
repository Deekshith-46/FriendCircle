const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted, allowOnlyCompleteProfile } = require('../../middlewares/reviewStatusMiddleware');
const femaleUserController = require('../../controllers/femaleUserControllers/femaleUserController');
const followingFollowersController = require('../../controllers/femaleUserControllers/followingFollowersController');
const chatController = require('../../controllers/femaleUserControllers/chatController');
const earningsController = require('../../controllers/femaleUserControllers/earningsController');

const giftController = require('../../controllers/femaleUserControllers/giftController');
const statsController = require('../../controllers/femaleUserControllers/statsController');
const kycController = require('../../controllers/femaleUserControllers/kycController');
const femaleUserLevelController = require('../../controllers/femaleUserControllers/femaleUserLevelController');
const { validateLevelRate } = require('../../middlewares/levelRateValidationMiddleware');
const blockListController = require('../../controllers/femaleUserControllers/blockListController');
const { parser, videoParser, profileParser } = require('../../config/multer');
const Transaction = require('../../models/common/Transaction');
const { getInterests } = require('../../controllers/common/interestController');
const { getLanguages } = require('../../controllers/common/languageController');
const { getFemaleUserOptions } = require('../../controllers/common/optionsController');
const { preventBlockedInteraction } = require('../../middlewares/blockMiddleware');

// Import the new follow request routes
const followRequestRoutes = require('./followRequestRoutes');

// Public routes for interests and languages (no auth required)
router.get('/interests', getInterests);
router.get('/languages', getLanguages);
router.get('/options', getFemaleUserOptions);

// ────────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES (No auth middleware required)
// ────────────────────────────────────────────────────────────────

// Registration and OTP
router.post('/register', femaleUserController.registerUser);

// Login Female User (Send OTP)
router.post('/login', femaleUserController.loginUser);

// Verify OTP (Registration)
router.post('/verify-otp', femaleUserController.verifyOtp);

// Verify Login OTP
router.post('/verify-login-otp', femaleUserController.verifyLoginOtp);

// ────────────────────────────────────────────────────────────────
// PROFILE COMPLETION ROUTES (Auth required, reviewStatus = 'completeProfile')
// ────────────────────────────────────────────────────────────────

// Upload Images (can be used for profile completion or later updates)
router.post('/upload-image', auth, parser.array('images', 5), femaleUserController.uploadImage);

// Upload Video (can be used for profile completion or later updates)
router.post('/upload-video', auth, videoParser.single('video'), femaleUserController.uploadVideo);

// Complete Profile after OTP Verification - UNIFIED API (accepts images + video + data)
router.post('/complete-profile', 
  auth, 
  profileParser.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 }
  ]),
  femaleUserController.completeUserProfile
);

// ────────────────────────────────────────────────────────────────
// PROTECTED ROUTES (Auth + reviewStatus = 'accepted' required)
// ────────────────────────────────────────────────────────────────

// Get Female User Profile
router.get('/me', auth, femaleUserController.getUserProfile);

// Balance Routes
router.use('/me/balance', require('./balanceRoutes'));

// Get withdrawal history
router.get('/me/withdrawals', auth, requireReviewAccepted, femaleUserController.getWithdrawalHistory);

// Get my transactions (female) with optional filters
router.get('/me/transactions', auth, requireReviewAccepted, async (req, res) => {
  try {
    const { operationType, startDate, endDate } = req.query;
    const filter = { userType: 'female', userId: req.user._id };
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

// ────────────────────────────────────────────────────────────────
// PROFILE UPDATE ROUTES (Auth + reviewStatus = 'accepted' required)
// ────────────────────────────────────────────────────────────────

// Update profile details (name, age, bio, preferences) - PATCH for partial updates
// Uses multer's none() to parse form-data without files
const multer = require('multer');
const upload = multer();
router.patch('/update-profile', auth, requireReviewAccepted, upload.none(), femaleUserController.updateUserInfo);

// Update profile details (name, age, bio) - PATCH for partial updates
router.patch('/profile-details', auth, requireReviewAccepted, upload.none(), femaleUserController.updateProfileDetails);

// Update earning rate (coinsPerMinute) only - PATCH for rate updates
router.patch('/earning-rate', auth, requireReviewAccepted, upload.none(), femaleUserController.updateEarningRate);

// Add more images (max 5 total)
router.post('/add-images', auth, requireReviewAccepted, parser.array('images', 5), femaleUserController.uploadImage);

// Delete specific image by ID
router.delete('/images/:imageId', auth, requireReviewAccepted, femaleUserController.deleteImage);

// Update/replace video - PATCH for replacement
router.patch('/update-video', auth, requireReviewAccepted, videoParser.single('video'), femaleUserController.uploadVideo);

// Delete video
router.delete('/video', auth, requireReviewAccepted, femaleUserController.deleteVideo);

// Update earning rate (coinsPerMinute) only - LEGACY ROUTE (kept for compatibility)
router.patch('/earning-rate', auth, requireReviewAccepted, upload.none(), femaleUserController.updateEarningRate);

// Level-based call rate system routes
router.get('/call-rate-settings', auth, requireReviewAccepted, femaleUserLevelController.getCallRateSettings);
router.get('/level-info', auth, requireReviewAccepted, femaleUserLevelController.getLevelInfo);
router.patch('/call-rates', auth, requireReviewAccepted, upload.none(), femaleUserLevelController.updateCallRates);
router.post('/calculate-level', auth, requireReviewAccepted, femaleUserLevelController.calculateLevel);
router.get('/levels', auth, requireReviewAccepted, femaleUserLevelController.getAllLevels);

// Delete preference item (hobbies, sports, film, music, travel)
router.delete('/preferences/:type/:itemId', auth, requireReviewAccepted, femaleUserController.deletePreferenceItem);

// Update user interests

// Update user languages
router.patch('/languages', auth, requireReviewAccepted, femaleUserController.updateLanguages);

// Update user hobbies
router.patch('/hobbies', auth, requireReviewAccepted, femaleUserController.updateHobbies);

// Update user sports
router.patch('/sports', auth, requireReviewAccepted, femaleUserController.updateSports);

// Update user film preferences
router.patch('/film', auth, requireReviewAccepted, femaleUserController.updateFilm);

// Update user music preferences
router.patch('/music', auth, requireReviewAccepted, femaleUserController.updateMusic);

// Update user travel preferences
router.patch('/travel', auth, requireReviewAccepted, femaleUserController.updateTravel);

// Update location
// Online Status Toggle
router.post('/toggle-online-status', auth, requireReviewAccepted, femaleUserController.toggleOnlineStatus);

// Location Refresh
router.post('/location/refresh', auth, requireReviewAccepted, femaleUserController.locationRefresh);

// Apply block middleware to protected routes
router.use(preventBlockedInteraction);

// Browse male users (paginated)
router.get('/browse-males', auth, requireReviewAccepted, femaleUserController.listMaleUsers);

// Follow Male User
router.post('/follow', auth, requireReviewAccepted, followingFollowersController.followUser);

// Follow Back a Male User (explicitly follow someone who is already following you)
router.post('/follow-back', auth, requireReviewAccepted, followingFollowersController.followBackUser);

// Unfollow Male User
router.post('/unfollow', auth, requireReviewAccepted, followingFollowersController.unfollowUser);

// Get Following List
router.get('/following', auth, requireReviewAccepted, followingFollowersController.getFemaleFollowingList);

// Get Followers List
router.get('/followers', auth, requireReviewAccepted, followingFollowersController.getFemaleFollowersList);

// Follow Request Management Routes
router.use('/follow-requests', followRequestRoutes);

// Delete User Account
router.delete('/delete', auth, femaleUserController.deleteUser);

// Chat Tabs Routes
router.use('/chat-tabs', require('./femaleChatTabsRoutes'));

// Chat Routes
router.post('/send-message', auth, requireReviewAccepted, chatController.sendMessage);
router.get('/chat-history', auth, requireReviewAccepted, chatController.getChatHistory);

// Earnings Routes
router.get('/rewards', auth, requireReviewAccepted, earningsController.getRewards);



// Earnings Breakdown per Male Routes
router.use('/earnings-breakdown', require('./femaleEarningsBreakdownRoutes'));

// Gift Routes
router.get('/gifts/received', auth, requireReviewAccepted, giftController.getReceivedGifts);
router.get('/gifts/stats', auth, requireReviewAccepted, giftController.getGiftStats);

// Stats Routes
router.get('/stats', auth, requireReviewAccepted, statsController.getFemaleUserStats);
router.get('/stats/:userId', auth, requireReviewAccepted, statsController.getFemaleUserStats);
router.get('/rewards/history', auth, requireReviewAccepted, statsController.getRewardHistory);
router.get('/rewards/weekly-rank', auth, requireReviewAccepted, statsController.getWeeklyRanking);
router.post('/increment-missed-calls', auth, requireReviewAccepted, statsController.incrementMissedCalls);
router.post('/increment-missed-calls/:userId', auth, requireReviewAccepted, statsController.incrementMissedCalls);

// Score Routes
router.use('/scores', require('./scoreRoutes'));

// KYC Routes
router.post('/submit-kyc', auth, requireReviewAccepted, kycController.submitKYC);
router.post('/verify-kyc', auth, requireReviewAccepted, kycController.verifyKYC);

// Blocklist Routes
router.post('/block', auth, requireReviewAccepted, blockListController.blockUser);
router.post('/unblock', auth, requireReviewAccepted, blockListController.unblockUser);
router.get('/block-list', auth, requireReviewAccepted, blockListController.getBlockList);

// Call Routes
const callController = require('../../controllers/femaleUserControllers/callController');
router.get('/calls/history', auth, requireReviewAccepted, callController.getCallHistory);
router.get('/calls/stats', auth, requireReviewAccepted, callController.getCallStats);
router.post('/calls/end', auth, requireReviewAccepted, callController.endCall);
router.post('/calls/rate', auth, requireReviewAccepted, callController.submitCallRating);

module.exports = router;