const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const balanceController = require('../../controllers/common/withdrawalController');

// Get agency user balance with rupee conversion
router.get('/', auth, requireReviewAccepted, balanceController.getMyBalance);

module.exports = router;