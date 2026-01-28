const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const controller = require('../../controllers/adminControllers/adminTopFansController');

// Get Top Fans for a specific female user (admin view)
router.get('/top-fans/:femaleId', auth, dynamicPermissionCheck, controller.getTopFansForFemale);

// Get Top Fans summary for admin dashboard
router.get('/top-fans-summary', auth, dynamicPermissionCheck, controller.getTopFansSummary);

module.exports = router;