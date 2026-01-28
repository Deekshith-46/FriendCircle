const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/maleUserControllers/chatController');
const auth = require('../../middlewares/authMiddleware');

// Send a message
router.post('/send-message', auth, chatController.sendMessage);

// Get chat history
router.get('/chat-history', auth, chatController.getChatHistory);

module.exports = router;
