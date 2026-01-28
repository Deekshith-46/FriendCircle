// /routes/femaleUserRoutes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/femaleUserControllers/chatController');
const auth = require('../../middlewares/authMiddleware');

// Send message (text, image, video, etc.)
router.post('/send-message', auth, chatController.sendMessage);

// Get chat history between users
router.get('/chat-history', auth, chatController.getChatHistory);

module.exports = router;
