const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const earningsController = require('../../controllers/agencyControllers/agencyEarningsController');

// Get earnings for referred females - POST method (enhanced security)
router.post('/', auth, requireReviewAccepted, earningsController.getAgencyEarnings);



module.exports = router;