const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const chatController = require('../../controllers/common/chatController');
const { parser } = require('../../config/multer');

// Upload media files
router.post('/upload', auth, parser.single('file'), chatController.uploadMedia);

// Get user's uploaded media files
router.get('/uploads', auth, chatController.getUploadedMedia);

// Start chat (mutual follow validation)
router.post('/start', auth, chatController.startChat);

// Get chat rooms for user
router.get('/rooms', auth, chatController.getChatRooms);

// Get messages for a chat room
router.get('/:roomId/messages', auth, chatController.getMessages);

// Send message
router.post('/send', auth, chatController.sendMessage);

// Delete message for user
router.delete('/message/:messageId', auth, chatController.deleteMessage);

// Delete message for everyone
router.delete('/message/:messageId/delete-for-everyone', auth, chatController.deleteMessageForEveryone);

// Mark message as read
router.post('/mark-as-read', auth, chatController.markAsRead);

// Clear chat messages only
router.delete('/room/:roomId/clear', auth, chatController.clearChat);

// Delete entire chat for user
router.delete('/room/:roomId', auth, chatController.deleteChat);

// Toggle disappearing messages
router.post('/:roomId/disappearing', auth, chatController.toggleDisappearing);

module.exports = router;