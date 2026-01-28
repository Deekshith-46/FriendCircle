const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/agencyControllers/chatController');
const auth = require('../../middlewares/authMiddleware');

// Get list of female users referred by the agency
router.get('/referred-users', auth, chatController.getReferredFemaleUsers);

// Get all chat rooms for the agency
router.get('/rooms', auth, chatController.getChatRooms);

// Get or create a chat room
router.post('/room', auth, chatController.getOrCreateChatRoom);

// Send a message
router.post('/send-message', auth, chatController.sendMessage);

// Get chat history
router.get('/chat-history', auth, chatController.getChatHistory);

// Mark messages as read
router.post('/mark-as-read', auth, chatController.markAsRead);

// Get unread count for a specific chat
router.get('/unread-count', auth, chatController.getUnreadCount);

module.exports = router;