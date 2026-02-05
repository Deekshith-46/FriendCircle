const ChatRoom = require('../../models/chat/ChatRoom');
const Message = require('../../models/chat/Message');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const FemaleImage = require('../../models/femaleUser/Image');
const AgencyUser = require('../../models/agency/AgencyUser');
const { checkBlockStatus } = require('../../middlewares/blockMiddleware');
const { isBlocked } = require('../../services/blockService');

// Create or get chat room between agency and female user
const getOrCreateChatRoom = async (agencyId, femaleId) => {
  // First, verify that the female user is referred by this agency
  const femaleUser = await FemaleUser.findById(femaleId);
  if (!femaleUser) {
    throw new Error('Female user not found');
  }

  // Check if the female user is referred by this agency
  // referredByAgency is a single ObjectId reference, not an array
  const isReferredByAgency = femaleUser.referredByAgency && 
    femaleUser.referredByAgency.toString() === agencyId.toString();
  
  if (!isReferredByAgency) {
    throw new Error('Agency can only chat with users they have referred');
  }

  // Create a unique room key for agency-female chat
  const roomKey = `agency_${agencyId}_female_${femaleId}`;
  
  // Try to find existing chat room
  let chatRoom = await ChatRoom.findOne({ roomKey });
  
  if (!chatRoom) {
    // Create new chat room
    chatRoom = new ChatRoom({
      participants: [
        { userId: agencyId, userType: 'agency' },
        { userId: femaleId, userType: 'female' }
      ],
      roomKey: roomKey
    });
    await chatRoom.save();
  }
  
  return chatRoom;
};

// Send a message
exports.sendMessage = async (req, res) => {
  const { receiverId, type, content, mediaMetadata } = req.body;

  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Create or get chat room
    const chatRoom = await getOrCreateChatRoom(req.user._id, receiverId);
    
    // 🔒 FINAL BLOCK CHECK FOR EXISTING ROOMS (real-time check)
    const otherUser = chatRoom.participants.find(
      p => p.userId.toString() !== req.user._id.toString()
    );
    
    if (otherUser) {
      const blockResult = await isBlocked(
        req.user._id, 
        'agency', 
        otherUser.userId, 
        otherUser.userType
      );
      
      if (blockResult.isBlocked) {
        return res.status(403).json({ 
          success: false, 
          message: 'Blocked users cannot send messages to each other.' 
        });
      }
    }

    // Create message
    const message = new Message({
      chatRoomId: chatRoom._id,
      senderId: req.user._id,
      senderType: 'agency',
      type: type || 'text',
      content: content,
      mediaMetadata: mediaMetadata,
      isMedia: type !== 'text'
    });

    await message.save();

    // Update chat room with last message
    chatRoom.lastMessage = content;
    chatRoom.lastMessageAt = new Date();
    await chatRoom.save();

    // Update unread count for the receiver
    const receiverParticipant = chatRoom.participants.find(p => p.userId.toString() === receiverId.toString());
    if (receiverParticipant) {
      await ChatRoom.updateOne(
        { _id: chatRoom._id },
        { $inc: { [`unreadMap.${receiverId}`]: 1 } }
      );
    }

    res.json({ success: true, data: message });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get chat history
exports.getChatHistory = async (req, res) => {
  const { receiverId, limit = 50, skip = 0 } = req.query;

  if (!receiverId) {
    return res.status(400).json({ success: false, message: 'Receiver ID is required' });
  }

  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Create or get chat room
    const chatRoom = await getOrCreateChatRoom(req.user._id, receiverId);
    
    // 🔒 BLOCK CHECK FOR MESSAGE FETCHING (real-time check)
    const otherUser = chatRoom.participants.find(
      p => p.userId.toString() !== req.user._id.toString()
    );
    
    if (otherUser) {
      const blockResult = await isBlocked(
        req.user._id, 
        'agency', 
        otherUser.userId, 
        otherUser.userType
      );
      
      if (blockResult.isBlocked) {
        return res.status(403).json({ 
          success: false, 
          message: 'Blocked users cannot view chat history.' 
        });
      }
    }

    // Get messages
    const messages = await Message.find({ chatRoomId: chatRoom._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Reverse messages to show oldest first
    const sortedMessages = messages.reverse();

    res.json({ success: true, data: sortedMessages });
  } catch (err) {
    console.error('Error getting chat history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get list of female users referred by the agency
exports.getReferredFemaleUsers = async (req, res) => {
  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Find all female users referred by this agency
    const femaleUsers = await FemaleUser.find({
      referredByAgency: req.user._id,
      reviewStatus: 'accepted'
    }).select('name images onlineStatus');

    // Get the first image for each user
    const usersWithImages = await Promise.all(femaleUsers.map(async (user) => {
      let profileImage = null;
      if (user.images && user.images.length > 0) {
        const FemaleImage = require('../../models/femaleUser/Image');
        const imageDoc = await FemaleImage.findById(user.images[0]);
        if (imageDoc) {
          profileImage = imageDoc.imageUrl;
        }
      }
      
      return {
        _id: user._id,
        name: user.name,
        profileImage: profileImage,
        onlineStatus: user.onlineStatus
      };
    }));

    res.json({ success: true, data: usersWithImages });
  } catch (err) {
    console.error('Error getting referred female users:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  const { receiverId, messageIds } = req.body;

  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Create or get chat room
    const chatRoom = await getOrCreateChatRoom(req.user._id, receiverId);

    // Update messages as read
    if (messageIds && messageIds.length > 0) {
      await Message.updateMany(
        { 
          _id: { $in: messageIds },
          chatRoomId: chatRoom._id,
          senderId: receiverId,
          senderType: 'female',
          'readBy.userId': { $ne: req.user._id }
        },
        {
          $push: {
            readBy: {
              userId: req.user._id,
              userType: 'agency',
              readAt: new Date()
            }
          }
        }
      );
    }

    // Reset unread count for this user
    await ChatRoom.updateOne(
      { _id: chatRoom._id },
      { 
        $set: { [`unreadMap.${req.user._id}`]: 0 },
        $set: { [`lastReadMap.${req.user._id}`]: new Date() }
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get unread count for a specific chat
exports.getUnreadCount = async (req, res) => {
  const { receiverId } = req.query;

  if (!receiverId) {
    return res.status(400).json({ success: false, message: 'Receiver ID is required' });
  }

  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Create or get chat room
    const chatRoom = await getOrCreateChatRoom(req.user._id, receiverId);

    // Get unread count from unreadMap
    const unreadCount = chatRoom.unreadMap.get(req.user._id.toString()) || 0;

    res.json({ success: true, data: { unreadCount } });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get or create chat room
exports.getOrCreateChatRoom = async (req, res) => {
  const { receiverId } = req.body;

  if (!receiverId) {
    return res.status(400).json({ success: false, message: 'Receiver ID is required' });
  }

  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Create or get chat room
    const chatRoom = await getOrCreateChatRoom(req.user._id, receiverId);

    // Populate participant details
    const populatedChatRoom = await ChatRoom.findById(chatRoom._id)
      .populate('participants.userId', 'name images');

    res.json({ success: true, data: populatedChatRoom });
  } catch (err) {
    console.error('Error getting or creating chat room:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all chat rooms for the agency
exports.getChatRooms = async (req, res) => {
  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Find all chat rooms where the agency is a participant
    const chatRooms = await ChatRoom.find({
      'participants.userId': req.user._id,
      'participants.userType': 'agency'
    }).populate('participants.userId', 'name images onlineStatus');

    // Preload all blocked user IDs to improve performance
    const FemaleBlockList = require('../../models/femaleUser/BlockList');
    const MaleBlockList = require('../../models/maleUser/BlockList');
    const AgencyBlockList = require('../../models/agency/BlockList');
    
    const blockedRecords = await AgencyBlockList.find({ agencyUserId: req.user._id }).select('blockedUserId');
    const blockedUserIds = blockedRecords.map(record => record.blockedUserId.toString());
    
    // Also get users who blocked this user
    const blockers = await AgencyBlockList.find({ blockedUserId: req.user._id }).select('agencyUserId');
    blockers.forEach(blocker => blockedUserIds.push(blocker.agencyUserId.toString()));
    
    // Create a Set for O(1) lookup
    const blockedUserSet = new Set(blockedUserIds);

    // Get the latest message for each chat room
    const chatRoomsWithLatestMessage = await Promise.all(chatRooms.map(async (room) => {
      // 🔒 CHECK IF CHAT IS BLOCKED BEFORE RETURNING
      const otherParticipant = room.participants.find(p => p.userId.toString() !== req.user._id.toString());
      
      if (otherParticipant) {
        // Use the preloaded blocked user set for O(1) lookup
        const otherUserId = otherParticipant.userId ? otherParticipant.userId._id.toString() : otherParticipant.userId;
        
        if (blockedUserSet.has(otherUserId)) {
          // Skip this room if blocked
          return null;
        }
      }
      
      const latestMessage = await Message.findOne({ chatRoomId: room._id })
        .sort({ createdAt: -1 })
        .limit(1);
      
      // Get unread count for this agency user
      const unreadCount = room.unreadMap.get(req.user._id.toString()) || 0;
      
      // Get the other participant (female user)
      const femaleParticipant = room.participants.find(p => p.userType === 'female');
      let femaleUser = null;
      if (femaleParticipant) {
        femaleUser = await FemaleUser.findById(femaleParticipant.userId)
          .select('name images onlineStatus');
      }
      
      return {
        _id: room._id,
        femaleUser: femaleUser ? {
          _id: femaleUser._id,
          name: femaleUser.name,
          profileImage: femaleUser.images && femaleUser.images.length > 0 ? 
            (await FemaleImage.findById(femaleUser.images[0])).imageUrl : null,
          onlineStatus: femaleUser.onlineStatus
        } : null,
        lastMessage: room.lastMessage,
        lastMessageAt: room.lastMessageAt,
        unreadCount: unreadCount,
        createdAt: room.createdAt
      };
    }));
    
    // Filter out null rooms (blocked conversations)
    const filteredChatRooms = chatRoomsWithLatestMessage.filter(room => room !== null);

    // Sort by last message time (newest first)
    const sortedChatRooms = filteredChatRooms.sort((a, b) => 
      new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt)
    );

    res.json({ success: true, data: sortedChatRooms });
  } catch (err) {
    console.error('Error getting chat rooms:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};