const ChatRoom = require('../../models/chat/ChatRoom');
const Message = require('../../models/chat/Message');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const { messages } = require('../../validations/messages');
const { sendChatNotification } = require('../../services/notificationService');

// Helper function to check chat permissions
const checkChatPermission = async (senderId, senderType, receiverId, receiverType) => {
  try {
    // Check if either user has blocked the other
    const BlockList = require('../../models/femaleUser/BlockList');

    // Check if sender has blocked receiver
    const senderBlocksReceiver = await BlockList.findOne({
      $or: [
        { blockerId: senderId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: senderId }
      ]
    });

    if (senderBlocksReceiver) {
      return {
        allowed: false,
        reason: 'BLOCKED_USER'
      };
    }

    // Only male → female case supported
    if (senderType === 'male' && receiverType === 'female') {
      const followRecord = await require('../../models/common/FollowRequest').findOne({
        maleUserId: senderId,
        femaleUserId: receiverId
      });

      if (!followRecord) {
        return {
          allowed: false,
          reason: 'NO_REQUEST'
        };
      }

      if (followRecord.status === 'pending') {
        return {
          allowed: false,
          reason: 'REQUEST_NOT_ACCEPTED'
        };
      }

      // status === accepted
      return {
        allowed: true
      };
    }

    // Optional: female → male messaging (if allowed)
    if (senderType === 'female' && receiverType === 'male') {
      return { allowed: true };
    }

    // Agency → female messaging (only for referred users)
    if (senderType === 'agency' && receiverType === 'female') {
      // Check if the female user is referred by this agency
      const FemaleUser = require('../../models/femaleUser/FemaleUser');
      const femaleUser = await FemaleUser.findById(receiverId);

      if (!femaleUser) {
        return {
          allowed: false,
          reason: 'FEMALE_USER_NOT_FOUND'
        };
      }

      const isReferredByAgency = femaleUser.referredByAgency &&
        femaleUser.referredByAgency.toString() === senderId.toString();

      if (!isReferredByAgency) {
        return {
          allowed: false,
          reason: 'NOT_REFERRED_USER'
        };
      }

      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'INVALID_RELATION'
    };
  } catch (error) {
    console.error('Error checking chat permission:', error);
    return {
      allowed: false,
      reason: 'ERROR'
    };
  }
};

exports.startChat = async (req, res) => {
  try {
    const { femaleId } = req.body;
    const senderId = req.user.id;
    const senderType = req.userType;

    // Check chat permissions
    const permission = await checkChatPermission(
      req.user.id,
      req.userType,
      femaleId,
      'female'
    );

    if (!permission.allowed) {
      let message = 'You cannot start a chat';

      if (permission.reason === 'NO_REQUEST') {
        message = 'You must send a follow request before messaging this user';
      }

      if (permission.reason === 'REQUEST_NOT_ACCEPTED') {
        message = 'You cannot send messages because the female user has not accepted your follow request yet';
      }

      if (permission.reason === 'BLOCKED_USER') {
        message = 'You cannot send messages to this user because one of you has blocked the other';
      }

      if (permission.reason === 'NOT_REFERRED_USER') {
        message = 'You can only chat with users you have referred';
      }

      if (permission.reason === 'FEMALE_USER_NOT_FOUND') {
        message = 'Female user not found';
      }

      return res.status(403).json({
        success: false,
        reason: permission.reason,
        message
      });
    }

    // Generate room key to prevent duplicates (sorted userIds to ensure same key regardless of order)
    const userIds = [femaleId.toString(), senderId.toString()].sort();
    const roomKey = `${userIds[0]}_${userIds[1]}`;

    // Check if chat room already exists using roomKey
    let room = await ChatRoom.findOne({ roomKey });

    if (!room) {
      room = await ChatRoom.create({
        participants: [
          { userId: femaleId, userType: 'female' },
          { userId: senderId, userType: senderType }
        ],
        roomKey
      });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { roomId, messageIds } = req.body;
    const userId = req.user.id;
    const userType = req.userType;

    // Handle both single messageId (backward compatibility) and array of messageIds
    let idsToProcess = [];
    if (messageIds) {
      idsToProcess = Array.isArray(messageIds) ? messageIds : [messageIds];
    } else if (req.body.messageId) {
      // Check if messageId is an array or single value
      idsToProcess = Array.isArray(req.body.messageId) ? req.body.messageId : [req.body.messageId];
    }

    if (!idsToProcess || idsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messageIds array is required'
      });
    }

    // Verify user has access to this room
    const room = await ChatRoom.findOne({
      _id: roomId,
      'participants.userId': userId
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to chat room'
      });
    }

    // Find messages that belong to the room, sent by other users, and not already read by this user
    const messages = await Message.find({
      _id: { $in: idsToProcess },
      chatRoomId: roomId,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId }
    });

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No messages to mark as read'
      });
    }

    // Update all messages with read status
    for (const message of messages) {
      // Update message as read by this user
      await Message.findByIdAndUpdate(
        message._id,
        {
          $push: {
            readBy: {
              userId: userId,
              userType: userType,
              readAt: new Date()
            }
          }
        },
        { new: true }
      );
    }

    // Get the current room to access the current unread count and last read time
    const currentRoom = await ChatRoom.findById(roomId);

    // Find the latest message among those marked as read to use as the new last read time
    const latestMessage = await Message.findOne({
      _id: { $in: idsToProcess },
      chatRoomId: roomId,
      senderId: { $ne: userId }
    }).sort({ createdAt: -1 });

    // Use the latest message's creation time as the new last read time
    const newLastReadTime = latestMessage ? latestMessage.createdAt : new Date();

    // Count messages from other users that were sent after the new last read time
    // These are the messages that remain unread
    const newUnreadCount = await Message.countDocuments({
      chatRoomId: roomId,
      senderId: { $ne: userId },
      isDeletedFor: { $ne: userId },
      createdAt: { $gt: newLastReadTime }
    });

    // Update the room's last read time and unread count for this user using the new map approach
    await ChatRoom.updateOne(
      { _id: roomId },
      {
        $set: {
          [`lastReadMap.${userId}`]: newLastReadTime,
          [`unreadMap.${userId}`]: newUnreadCount
        }
      }
    );

    // Emit socket event for real-time updates
    const { getIO } = require('../../../src/socketInstance');
    const io = getIO();

    io.to(roomId).emit('messageRead', {
      roomId,
      messageIds: messages.map(m => m._id.toString()),
      readerId: userId,
      readerType: userType,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `${messages.length} message(s) marked as read`,
      readMessageIds: messages.map(m => m._id.toString())
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this room
    const room = await ChatRoom.findOne({
      _id: roomId,
      'participants.userId': userId
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to chat room'
      });
    }

    // Instead of hard delete, mark room as deleted for this user
    // This preserves chat for the other user
    await ChatRoom.updateOne(
      { _id: roomId },
      { $addToSet: { isDeletedFor: userId } }
    );

    // Optionally, you could soft-delete messages as well
    await Message.updateMany(
      { chatRoomId: roomId },
      { $addToSet: { isDeletedFor: userId } }
    );

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Clear chat - remove all messages for this user only
exports.clearChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this room
    const room = await ChatRoom.findOne({
      _id: roomId,
      'participants.userId': userId
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to chat room'
      });
    }

    // Clear messages only (for this user)
    await Message.updateMany(
      { chatRoomId: roomId },
      { $addToSet: { isDeletedFor: userId } }
    );

    // Reset unread count by updating lastReadBy for this user
    await ChatRoom.updateOne(
      { _id: roomId },
      { $pull: { lastReadBy: { userId } } }
    );

    await ChatRoom.updateOne(
      { _id: roomId },
      {
        $push: {
          lastReadBy: {
            userId: userId,
            userType: req.user.type,
            lastReadAt: new Date()
          }
        }
      }
    );

    res.json({ success: true, message: 'Chat cleared' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the message and verify sender is the one trying to delete
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if message is already deleted for everyone
    if (message.isDeletedForEveryone) {
      return res.status(400).json({
        success: false,
        message: 'Message already deleted for everyone'
      });
    }

    // Only the sender can delete for everyone
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only sender can delete message for everyone'
      });
    }

    // Mark message as deleted for everyone
    message.isDeletedForEveryone = true;
    message.deletedForEveryoneAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted for everyone'
    });
  } catch (error) {
    console.error('Error deleting message for everyone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.uploadMedia = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', // Images
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', // Videos
      'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/mp4', 'audio/mp3', 'audio/m4a', 'audio/3gpp', 'audio/3gpp2' // Audio
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'File type not allowed. Allowed types: images, videos, audio'
      });
    }

    // Validate file size
    const maxSize = {
      'image': 5 * 1024 * 1024, // 5MB for images
      'video': 50 * 1024 * 1024, // 50MB for videos
      'audio': 10 * 1024 * 1024  // 10MB for audio
    };

    const fileType = file.mimetype.startsWith('image') ? 'image' :
      file.mimetype.startsWith('video') ? 'video' : 'audio';

    if (file.size > maxSize[fileType]) {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${maxSize[fileType] / (1024 * 1024)}MB for ${fileType}s`
      });
    }

    // Verify user is active and verified
    const userId = req.user.id;
    const userType = req.userType;

    let user;
    if (userType === 'female') {
      const FemaleUser = require('../../models/femaleUser/FemaleUser');
      user = await FemaleUser.findById(userId);
    } else if (userType === 'male') {
      const MaleUser = require('../../models/maleUser/MaleUser');
      user = await MaleUser.findById(userId);
    }

    if (!user || !user.isActive || !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'User account not active or verified'
      });
    }

    // Import cloudinary here to avoid circular dependencies
    const cloudinary = require('../../config/cloudinary');

    // Convert buffer to stream and upload to Cloudinary
    const streamifier = require('streamifier');

    const uploadStream = (buffer) => {
      return new Promise((resolve, reject) => {
        // Configure Cloudinary upload with eager transformations for thumbnails
        const uploadOptions = {
          resource_type: file.mimetype.startsWith('video') ? 'video' : 'auto',
          eager: [
            // Generate thumbnail for videos
            ...(file.mimetype.startsWith('video') ? [{
              width: 300,
              height: 200,
              crop: 'fill',
              format: 'jpg',
              quality: 'auto'
            }] : []),
            // Generate thumbnail for images
            ...(file.mimetype.startsWith('image') ? [{
              width: 300,
              height: 200,
              crop: 'fill',
              quality: 'auto'
            }] : [])
          ],
          eager_async: true  // Process transformations asynchronously
        };

        const cld_upload_stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        streamifier.createReadStream(buffer).pipe(cld_upload_stream);
      });
    };

    const result = await uploadStream(file.buffer);

    // Prepare response with media metadata
    const mediaResponse = {
      url: result.secure_url,
      type: file.mimetype.startsWith('image') ? 'image' :
        file.mimetype.startsWith('video') ? 'video' : 'audio',
      filename: file.originalname,
      publicId: result.public_id,
      metadata: {
        thumbnail: result.eager?.[0]?.secure_url || result.secure_url, // Use eager transformation as thumbnail if available, fallback to secure_url
        duration: result.duration || null,
        width: result.width || null,
        height: result.height || null,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    };

    res.json({
      success: true,
      data: mediaResponse
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getChatRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType; // Get user type from auth middleware

    const rooms = await ChatRoom.find({
      'participants.userId': userId,
      'isDeletedFor': { $ne: userId }  // Exclude rooms deleted by this user
    })
      .sort({ updatedAt: -1 });

    // Manually populate participants based on their individual user types
    const populatedRooms = await Promise.all(rooms.map(async (room) => {
      const populatedParticipants = await Promise.all(room.participants.map(async (participant) => {
        // Convert participant to plain object if it's a Mongoose document
        const participantObj = participant.toObject ? participant.toObject() : participant;

        // Check if userId is already populated with user data (has name property)
        if (participantObj.userId && typeof participantObj.userId === 'object' && participantObj.userId.name) {
          // Already populated with user data, return as is
          return participantObj;
        }

        // If userId is null/undefined, return as is
        if (!participantObj.userId) {
          return participantObj;
        }

        let userModel;
        if (participantObj.userType === 'female') {
          userModel = require('../../models/femaleUser/FemaleUser');
        } else if (participantObj.userType === 'male') {
          userModel = require('../../models/maleUser/MaleUser');
        } else {
          // Skip for other user types
          return {
            ...participantObj,
            userId: null
          };
        }

        const user = await userModel.findById(participantObj.userId)
          .select('name firstName lastName images profileCompleted'); // Include name fields for both user types

        // Format user data with name and only first image
        let formattedUser = null;
        if (user) {
          let imageUrl = null;

          if (user.images && user.images.length > 0) {
            // For both user types, images are stored as references to Image documents
            // We need to get the actual image URL from the referenced document
            if (participantObj.userType === 'female') {
              const FemaleImage = require('../../models/femaleUser/Image');
              const firstImageRef = user.images[0];
              const imageDoc = await FemaleImage.findById(firstImageRef);
              if (imageDoc && imageDoc.imageUrl) {
                imageUrl = imageDoc.imageUrl;
              }
            } else if (participantObj.userType === 'male') {
              const MaleImage = require('../../models/maleUser/Image');
              const firstImageRef = user.images[0];
              const imageDoc = await MaleImage.findById(firstImageRef);
              if (imageDoc && imageDoc.imageUrl) {
                imageUrl = imageDoc.imageUrl;
              }
            }
          }

          // Determine name based on user type
          let userName = null;
          if (participantObj.userType === 'female') {
            userName = user.name || null;
          } else if (participantObj.userType === 'male') {
            // For male users, combine firstName and lastName
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            userName = firstName || lastName ? `${firstName} ${lastName}`.trim() : `Male User ${user._id}`;
          }

          formattedUser = {
            _id: user._id,
            name: userName,
            image: imageUrl, // Full image URL
            profileCompleted: user.profileCompleted
          };
        }

        return {
          ...participantObj,
          userId: formattedUser
        };
      }));

      return {
        ...room.toObject(),
        participants: populatedParticipants
      };
    }));

    // Calculate unread counts for each room using the new unreadMap system
    const roomsWithUnread = await Promise.all(populatedRooms.map(async (room) => {
      // Convert room to plain object if it's a Mongoose document
      const roomObj = room.toObject ? room.toObject() : room;

      // Use the unreadMap for the current user (new system) - keyed by userId
      let unreadCount = 0;
      if (roomObj.unreadMap && typeof roomObj.unreadMap.get === 'function') {
        // If unreadMap is a Map object (from MongoDB)
        unreadCount = roomObj.unreadMap.get(userId.toString()) || 0;
      } else if (roomObj.unreadMap && roomObj.unreadMap[userId.toString()]) {
        // If unreadMap is a plain object (fallback)
        unreadCount = roomObj.unreadMap[userId.toString()] || 0;
      } else {
        // Fallback to old system if new fields don't exist
        // Find the last read time for this user in this room from lastReadMap
        const lastReadTime = roomObj.lastReadMap?.[userId.toString()];

        // Count messages sent after user's last read time
        unreadCount = await Message.countDocuments({
          chatRoomId: roomObj._id,
          isDeletedFor: { $ne: userId },
          createdAt: { $gt: lastReadTime || new Date(0) },
          'senderId': { $ne: userId } // Only count messages from other user
        });
      }

      return {
        ...roomObj,
        unreadCount
      };
    }));

    res.json({ success: true, data: roomsWithUnread });
  } catch (error) {
    console.error('Error getting chat rooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this room
    const room = await ChatRoom.findOne({
      _id: roomId,
      'participants.userId': userId
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to chat room'
      });
    }

    const messages = await Message.find({
      chatRoomId: roomId,
      isDeletedFor: { $ne: userId }
    })
      .sort({ createdAt: 1 });

    // Process messages to handle deletedForEveryone
    const processedMessages = messages.map(msg => {
      if (msg.isDeletedForEveryone) {
        return {
          ...msg.toObject(),
          content: 'Message deleted',
          type: 'text' // Change type to text for deleted message
        };
      }
      return msg;
    });

    res.json({ success: true, data: processedMessages });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { isDeletedFor: userId } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.toggleDisappearing = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userType = req.userType;
    const { enabled, hours = 24 } = req.body;

    // Verify user has access to this room
    const room = await ChatRoom.findOne({
      _id: roomId,
      'participants.userId': userId
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to chat room'
      });
    }

    if (enabled) {
      // Enable disappearing messages
      room.isDisappearing = true;
      room.disappearingAfterHours = hours;

      // Track who enabled disappearing messages
      room.disappearingEnabledBy = {
        userId: userId,
        userType: userType,
        enabledAt: new Date()
      };

      // await room.save();
      await ChatRoom.findByIdAndUpdate(roomId, {
        isDisappearing: enabled,
        disappearingAfterHours: enabled ? hours : null,
        disappearingEnabledBy: enabled ? {
          userId: userId,
          userType: userType,
          enabledAt: new Date()
        } : null
      });

      res.json({
        success: true,
        message: 'Disappearing messages enabled',
        data: room
      });
    } else {
      // Disable disappearing messages
      room.isDisappearing = false;
      room.disappearingAfterHours = null;
      room.disappearingEnabledBy = null;

      // await room.save();
      await ChatRoom.findByIdAndUpdate(roomId, {
        isDisappearing: false,
        disappearingAfterHours: null,
        disappearingEnabledBy: null
      });

      res.json({
        success: true,
        message: 'Disappearing messages disabled',
        data: room
      });
    }
  } catch (error) {
    console.error('Error toggling disappearing messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get user's uploaded media files
exports.getUploadedMedia = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find messages that contain media from this user
    const messages = await Message.find({
      senderId: userId,
      isMedia: true,
      type: { $in: ['image', 'video', 'audio'] }
    }).select('content type mediaMetadata createdAt').sort({ createdAt: -1 });

    // Transform to the requested format
    const mediaList = messages.map(message => {
      // Get filename from mediaMetadata if available, otherwise derive from URL
      let filename = null;
      if (message.mediaMetadata?.filename) {
        filename = message.mediaMetadata.filename;
      } else {
        // Extract filename from URL if not stored in metadata
        const urlParts = message.content.split('/');
        const fileNameFromUrl = urlParts[urlParts.length - 1];
        filename = fileNameFromUrl.replace(/\.[^/.]+$/, ''); // Remove extension
      }

      return {
        url: message.content,
        type: message.type,
        filename: filename,
        createdAt: message.createdAt
      };
    });

    res.json({ success: true, data: mediaList });

  } catch (error) {
    console.error('Error getting uploaded media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { roomId, receiverId, type, content } = req.body;
    const userId = req.user.id;
    const userType = req.userType;

    // Validate message type and content consistency
    if (!['text', 'image', 'video', 'audio', 'emoji'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message type'
      });
    }

    // Validate content based on type
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Additional validation for media types
    if (['image', 'video', 'audio'].includes(type)) {
      // Content can be a string URL or an object with URL
      let urlToValidate = content;
      if (typeof content === 'object' && content.url) {
        urlToValidate = content.url;
      }

      try {
        new URL(urlToValidate);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format for media content'
        });
      }
    }

    let room;

    if (roomId) {
      // Verify user has access to this room
      room = await ChatRoom.findOne({
        _id: roomId,
        'participants.userId': userId
      });

      if (!room) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to chat room'
        });
      }
    } else if (receiverId) {
      // For agencies, allow direct messaging to referred users by creating/getting room
      if (userType === 'agency') {
        // Validate that the sender can message this receiver
        const permission = await checkChatPermission(
          userId,
          userType,
          receiverId,
          'female'
        );

        if (!permission.allowed) {
          let message = 'You cannot send messages';

          if (permission.reason === 'NOT_REFERRED_USER') {
            message = 'You can only chat with users you have referred';
          } else if (permission.reason === 'FEMALE_USER_NOT_FOUND') {
            message = 'Female user not found';
          } else {
            message = 'Unauthorized to send message to this user';
          }

          return res.status(403).json({
            success: false,
            message: message
          });
        }

        // Generate room key to prevent duplicates
        const userIds = [receiverId.toString(), userId.toString()].sort();
        const roomKey = `${userIds[0]}_${userIds[1]}`;

        // Check if chat room already exists using roomKey
        room = await ChatRoom.findOne({ roomKey });

        if (!room) {
          room = await ChatRoom.create({
            participants: [
              { userId: receiverId, userType: 'female' },
              { userId: userId, userType: userType }
            ],
            roomKey
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Direct messaging requires roomId for non-agency users'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either roomId or receiverId is required'
      });
    }

    let expireAt = null;
    if (room.isDisappearing) {
      expireAt = new Date(
        Date.now() + room.disappearingAfterHours * 60 * 60 * 1000
      );
    }

    // Prepare message content based on type
    let messageContent = content;
    let isMediaMessage = false;
    let mediaMetadata = null;

    if (['image', 'video', 'audio'].includes(type)) {
      // If content is an object with media metadata
      if (typeof content === 'object' && content.url) {
        messageContent = content.url;
        isMediaMessage = true;
        mediaMetadata = content.metadata || null;
      } else {
        // If content is just a URL string
        isMediaMessage = true;
      }
    }

    const message = await Message.create({
      chatRoomId: roomId,
      senderId: userId,
      senderType: userType,
      type,
      content: messageContent,
      isMedia: isMediaMessage,
      mediaMetadata: mediaMetadata,
      expireAt
    });

    // Update last message with user-friendly preview
    let previewMessage = content;
    if (type === 'text') {
      previewMessage = content;
    } else if (type === 'image') {
      previewMessage = '📷 Photo';
    } else if (type === 'video') {
      previewMessage = '🎥 Video';
    } else if (type === 'audio') {
      previewMessage = '🎧 Voice message';
    } else if (type === 'emoji') {
      previewMessage = '🙂 Emoji';
    }

    // Use targeted update to avoid validation issues with existing lastReadBy entries
    await ChatRoom.findByIdAndUpdate(
      roomId,
      { 
        lastMessage: previewMessage,
        lastMessageAt: new Date()
      },
      { new: true }
    );

    // Revive chat if it was deleted by either participant
    await ChatRoom.updateOne(
      { _id: roomId },
      { $pull: { isDeletedFor: userId } }
    );

    // Send notification to the other user
    const otherUser = room.participants.find(participant => participant.userId.toString() !== userId.toString());
    if (otherUser) {
      // Send notification asynchronously (don't wait for it to complete)
      sendChatNotification(
        userId,           // senderId
        userType,         // senderType  
        otherUser.userId, // receiverId
        otherUser.userType, // receiverType
        message,          // messageData
        roomId            // roomId
      ).catch(err => {
        console.error('Failed to send notification:', err);
      });
    }

    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};