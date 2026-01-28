const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const controller = require('../../controllers/femaleUserControllers/femaleEarningsBreakdownController');

// Get earnings breakdown per male user
router.get('/breakdown-per-male', auth, requireReviewAccepted, controller.getEarningsBreakdownPerMale);

// Get earnings breakdown for a specific male user
router.get('/breakdown-for-male/:maleId', auth, requireReviewAccepted, controller.getEarningsBreakdownForMale);

module.exports = router;