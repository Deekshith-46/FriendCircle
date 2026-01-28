const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const ctrl = require('../../controllers/common/withdrawalController');

// List agency user transactions
router.get('/', auth, requireReviewAccepted, ctrl.listMyTransactions);

module.exports = router;