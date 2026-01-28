const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const ctrl = require('../../controllers/common/withdrawalController');

// Admin: list withdrawals
router.get('/', auth, dynamicPermissionCheck, ctrl.adminListWithdrawals);

// Admin: approve payout (create Razorpay payout)
router.post('/:id/approve', auth, dynamicPermissionCheck, ctrl.adminApproveWithdrawal);

// Admin: reject
router.post('/:id/reject', auth, dynamicPermissionCheck, ctrl.adminRejectWithdrawal);

module.exports = router;


