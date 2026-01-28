const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const femaleChatTabsController = require('../../controllers/femaleUserControllers/femaleChatTabsController');

// Get Important Chats
router.get('/important-chats', auth, femaleChatTabsController.getImportantChats);

// Get Top Fans
router.get('/top-fans', auth, femaleChatTabsController.getTopFans);

module.exports = router;