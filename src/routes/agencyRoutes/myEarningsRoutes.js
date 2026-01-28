// src/routes/agencyRoutes/myEarningsRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const myEarningsController = require('../../controllers/agencyControllers/myEarningsController');

// Import withdrawal controller separately
const withdrawalController = require('../../controllers/agencyControllers/myWithdrawalsController');

// My Earnings - POST method
router.post('/earnings/my-earnings', auth, requireReviewAccepted, myEarningsController.getMyEarnings);

// My Withdrawals - POST method
router.post('/earnings/my-withdrawals', auth, requireReviewAccepted, withdrawalController.getMyWithdrawals);

module.exports = router;