const express = require('express');
const router = express.Router();
const blockListController = require('../../controllers/maleUserControllers/blockListController');
const auth = require('../../middlewares/authMiddleware');

// Block a user
router.post('/block', auth, blockListController.blockUser);

// Unblock a user
router.post('/unblock', auth, blockListController.unblockUser);

// Get block list
router.get('/block-list', auth, blockListController.getBlockList);

module.exports = router;
