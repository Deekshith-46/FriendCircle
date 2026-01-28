// /routes/femaleUserRoutes/blockListRoutes.js
const express = require('express');
const router = express.Router();
const blockListController = require('../../controllers/femaleUserControllers/blockListController');
const auth = require('../../middlewares/authMiddleware');

// Block a user
router.post('/block', auth, blockListController.blockUser);

// Unblock a user
router.post('/unblock', auth, blockListController.unblockUser);

module.exports = router;
