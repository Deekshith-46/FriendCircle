const express = require('express');
const router = express.Router();
const agencyUserController = require('../../controllers/agencyControllers/agencyUserController');
const auth = require('../../middlewares/authMiddleware');
const { parser } = require('../../config/multer');

// Registration and OTP
router.post('/register', agencyUserController.agencyRegister);
router.post('/verify-otp', agencyUserController.agencyVerifyOtp);

// Login and verify
router.post('/login', agencyUserController.agencyLogin);
router.post('/verify-login-otp', agencyUserController.agencyVerifyLoginOtp);

// Profile
router.get('/me', auth, agencyUserController.agencyMe);

// Complete agency profile via form-data (fields: firstName, lastName, aadharOrPanNum, image)
router.post('/complete-profile', auth, parser.single('image'), agencyUserController.completeAgencyProfile);

// Update agency profile via form-data (fields: firstName, lastName, aadharOrPanNum, image)
router.put('/profile', auth, parser.single('image'), agencyUserController.updateAgencyProfile);

// KYC Routes
router.use('/kyc', require('./kycRoutes'));

// Balance Routes
router.use('/me/balance', require('./balanceRoutes'));

// Earnings Routes
router.use('/earnings', require('./earningsRoutes'));

// Score Routes
router.use('/scores', require('./scoreRoutes'));

// Transaction Routes
router.use('/me/transactions', require('./transactionRoutes'));

// Withdrawal Routes
router.use('/withdrawals', require('./withdrawalRoutes'));

// Chat Routes
router.use('/chat', require('./chatRoutes'));

// Block List Routes
router.use('/block-list', require('./blockListRoutes'));

// My Earnings & My Withdrawals Routes
const myEarningsController = require('../../controllers/agencyControllers/myEarningsController');
const myWithdrawalsController = require('../../controllers/agencyControllers/myWithdrawalsController');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');

router.post('/my-earnings', auth, requireReviewAccepted, myEarningsController.getMyEarnings);
router.get('/total-coins', auth, requireReviewAccepted, myEarningsController.getTotalCoins);
router.post('/my-withdrawals', auth, requireReviewAccepted, myWithdrawalsController.getMyWithdrawals);

module.exports = router;


