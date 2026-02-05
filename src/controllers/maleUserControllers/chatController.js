const Chat = require('../../models/maleUser/Chat');
const { checkBlockStatus } = require('../../middlewares/blockMiddleware');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const { isBlocked } = require('../../services/blockService');

// Send a message
exports.sendMessage = async (req, res) => {
  const { receiver, message, media, isVoiceNote, isDisappearing } = req.body;

  try {
    // Check if we have the required user information
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Check if either user has blocked the other
    const blockStatus = await checkBlockStatus(req.user.id, receiver, 'male', 'female');
    
    if (blockStatus.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Blocked users cannot send messages to each other.' 
      });
    }

    const newMessage = new Chat({
      sender: req.user.id,  // Sender is the logged-in male user
      receiver,
      message,
      media,
      isVoiceNote,
      isDisappearing
    });

    await newMessage.save();
    res.json({ success: true, data: newMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get chat history
exports.getChatHistory = async (req, res) => {
  const { receiverId } = req.query;

  if (!receiverId) {
    return res.status(400).json({ success: false, message: 'Receiver ID is required' });
  }

  try {
    // Check if we have the required user information
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Check if either user has blocked the other
    const blockStatus = await checkBlockStatus(req.user.id, receiverId, 'male', 'female');
    
    if (blockStatus.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Blocked users cannot view chat history.' 
      });
    }

    const chats = await Chat.find({
      $or: [
        { sender: req.user.id, receiver: receiverId },
        { sender: receiverId, receiver: req.user.id }
      ]
    }).sort('sentAt');  // Sort by sent time

    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};