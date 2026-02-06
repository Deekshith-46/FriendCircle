const express = require('express');
const router = express.Router();
const authAdmin = require('../../middlewares/authMiddleware');
const adminEarningsController = require('../../controllers/adminControllers/adminEarningsController');

// Test route with auth
router.get('/test', authAdmin, (req, res) => {
  res.json({ success: true, message: 'Earnings routes with auth working' });
});

// Get earnings summary (total, by source, recent)
router.get('/summary', authAdmin, adminEarningsController.getEarningsSummary);

// Get detailed earnings history with pagination
router.get('/history', authAdmin, adminEarningsController.getEarningsHistory);

// Get earnings by date range
router.get('/by-date', authAdmin, adminEarningsController.getEarningsByDate);

// Get top earning users
router.get('/top-users', authAdmin, adminEarningsController.getTopEarningUsers);

module.exports = router;