const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/maleUserControllers/chatController');
const auth = require('../../middlewares/authMiddleware');
const { preventBlockedInteraction } = require('../../middlewares/blockMiddleware');

// Send a message
router.post('/send-message', auth, preventBlockedInteraction, chatController.sendMessage);

// Get chat history
router.get('/chat-history', auth, preventBlockedInteraction, chatController.getChatHistory);

module.exports = router;
