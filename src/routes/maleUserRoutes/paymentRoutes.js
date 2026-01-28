const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/maleUserControllers/paymentController');
const testController = require('../../controllers/maleUserControllers/testController');
const auth = require('../../middlewares/authMiddleware');

// Get coin packages (backward-compatible alias)
router.get('/coin-pricing', auth, paymentController.getCoinPricing);
router.get('/packages', auth, paymentController.getCoinPricing);

// Create wallet recharge order
router.post('/wallet/order', auth, paymentController.createWalletOrder);

// Create coin recharge order
router.post('/coin/order', auth, paymentController.createCoinOrder);

// Verify payment
router.post('/verify', auth, paymentController.verifyPayment);

// Get payment history
router.get('/history', auth, paymentController.getPaymentHistory);

// Test Razorpay configuration
router.get('/test-razorpay', auth, testController.testRazorpay);

module.exports = router;
