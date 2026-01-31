// src/routes/agencyRoutes/referralRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { getReferredFemaleUsers, getReferralStats } = require('../../controllers/agencyControllers/referralController');

// Apply agency authentication middleware
router.use(auth);

// Test route to verify mounting
router.get('/test', (req, res) => {
  console.log('=== TEST ROUTE CALLED ===');
  console.log('Headers:', req.headers.authorization);
  res.json({ success: true, message: 'Referral routes are working!' });
});

// GET /agency/referrals/female-users
// Get female users who joined using agency's referral code
router.get('/female-users', getReferredFemaleUsers);

// GET /agency/referrals/stats
// Get referral statistics for agency
router.get('/stats', getReferralStats);

module.exports = router;