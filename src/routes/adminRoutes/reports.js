const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const controller = require('../../controllers/adminControllers/adminReportsController');

// Admin Earnings Reports
router.get('/reports/earnings-summary', auth, dynamicPermissionCheck, controller.getAdminEarningsSummary);
router.get('/reports/earnings-breakdown', auth, dynamicPermissionCheck, controller.getAdminEarningsBreakdown);
router.get('/reports/earnings-by-date', auth, dynamicPermissionCheck, controller.getAdminEarningsByDate);
router.get('/reports/agency-earnings', auth, dynamicPermissionCheck, controller.getAgencyEarningsSummary);

module.exports = router;