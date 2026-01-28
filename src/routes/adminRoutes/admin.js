const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/adminController');

router.post('/login', controller.loginAdmin);
router.get('/me', auth, controller.getProfile);
router.put('/me', auth, controller.updateAdmin);
// Delete Admin Account
router.delete('/me', auth, controller.deleteAdmin);

// Admin Config Routes
router.get('/config', auth, dynamicPermissionCheck, controller.getAdminConfig);
router.post('/config/min-call-coins', auth, dynamicPermissionCheck, parser.none(), controller.updateMinCallCoins);
router.post('/config/coin-to-rupee-rate', auth, dynamicPermissionCheck, parser.none(), controller.updateCoinToRupeeRate);
router.post('/config/min-withdrawal-amount', auth, dynamicPermissionCheck, parser.none(), controller.updateMinWithdrawalAmount);

// Referral Bonus Routes
router.get('/config/referral-bonus', auth, dynamicPermissionCheck, controller.getReferralBonus);
router.post('/config/referral-bonus', auth, dynamicPermissionCheck, parser.none(), controller.setReferralBonus);
router.put('/config/referral-bonus', auth, dynamicPermissionCheck, parser.none(), controller.updateReferralBonus);
router.delete('/config/referral-bonus', auth, dynamicPermissionCheck, controller.deleteReferralBonus);

// Admin Share Percentage Route
router.post('/config/admin-share-percentage', auth, dynamicPermissionCheck, parser.none(), controller.updateAdminSharePercentage);

// Nearby Distance Routes
router.use('/config', require('./adminConfig'));

// Include reports routes
const reportsRouter = require('./reports');
router.use('/', reportsRouter);

// Include payout routes
const payoutRouter = require('./payoutRoutes');
router.use('/withdrawals', payoutRouter);

module.exports = router;