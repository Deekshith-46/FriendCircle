// /routes/femaleUserRoutes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/femaleUserControllers/chatController');
const auth = require('../../middlewares/authMiddleware');
const { preventBlockedInteraction } = require('../../middlewares/blockMiddleware');

// Send message (text, image, video, etc.)
router.post('/send-message', auth, preventBlockedInteraction, chatController.sendMessage);

// Get chat history between users
router.get('/chat-history', auth, preventBlockedInteraction, chatController.getChatHistory);

module.exports = router;
