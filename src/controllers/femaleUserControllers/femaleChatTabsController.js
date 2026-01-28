const ChatRoom = require('../../models/chat/ChatRoom');
const Message = require('../../models/chat/Message');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleFavourites = require('../../models/femaleUser/Favourites');
const CallHistory = require('../../models/common/CallHistory'); // Add CallHistory model
const { getActiveConfigInternal } = require('../../controllers/adminControllers/topFanConfigController');

// Get Important Chats for Female User
exports.getImportantChats = async (req, res) => {
  try {
    const femaleId = req.user.id;

    // Find all chat rooms where female user is a participant
    const chatRooms = await ChatRoom.find({
      'participants.userId': femaleId,
      'isDeletedFor': { $ne: femaleId }
    });

    // Prepare arrays for batch processing
    const roomIds = [];
    const maleParticipantIds = [];
    const maleParticipantMap = {}; // Map room ID to male participant info
    const roomLastReadTimeMap = {}; // Map room ID to last read time

    for (const room of chatRooms) {
      const maleParticipant = room.participants.find(
        participant => participant.userId.toString() !== femaleId.toString() && participant.userType === 'male'
      );

      if (maleParticipant) {
        roomIds.push(room._id);
        maleParticipantIds.push(maleParticipant.userId);
        maleParticipantMap[room._id.toString()] = maleParticipant;
        
        // Find the last read time for this female user in this room
        const lastReadEntry = room.lastReadBy?.find(entry =>
          entry.userId.toString() === femaleId.toString()
        );
        roomLastReadTimeMap[room._id.toString()] = lastReadEntry ? lastReadEntry.lastReadAt : new Date(0);
      }
    }

    // Batch load all messages for the relevant rooms and participants
    const allMessages = await Message.find({
      chatRoomId: { $in: roomIds },
      senderId: { $in: maleParticipantIds },
      'isDeletedFor': { $ne: femaleId }
    }).sort({ chatRoomId: 1, createdAt: -1 }); // Sort by room and then by date descending

    // Process messages to build the maps
    const unreadMessagesMap = {};
    const unreadMediaMap = {};
    const lastMessagesMap = {};

    // Group messages by room
    const messagesByRoom = {};
    for (const message of allMessages) {
      const roomId = message.chatRoomId.toString();
      if (!messagesByRoom[roomId]) {
        messagesByRoom[roomId] = [];
      }
      messagesByRoom[roomId].push(message);
    }

    // Process each room's messages to calculate counts and find last message
    for (const roomId of roomIds) {
      const roomIdStr = roomId.toString();
      const roomMessages = messagesByRoom[roomIdStr] || [];
      const lastReadTime = roomLastReadTimeMap[roomIdStr];

      // Calculate unread counts
      let unreadCount = 0;
      let unreadMediaCount = 0;
      let lastMessage = null;

      for (const message of roomMessages) {
        // Check if message is unread
        if (message.createdAt > lastReadTime) {
          unreadCount++;
          if (['image', 'video', 'audio'].includes(message.type)) {
            unreadMediaCount++;
          }
        }

        // Track the last message (first in sorted list since sorted by date desc)
        if (!lastMessage) {
          lastMessage = message;
        }
      }

      unreadMessagesMap[roomIdStr] = unreadCount;
      unreadMediaMap[roomIdStr] = unreadMediaCount;
      lastMessagesMap[roomIdStr] = lastMessage;
    }

    // Batch load missed calls for all relevant participants
    const missedCallsMap = {};
    if (maleParticipantIds.length > 0) {
      const missedCalls = await CallHistory.find({
        callerId: { $in: maleParticipantIds },
        receiverId: femaleId,
        status: 'missed'
      });

      // Group missed calls by callerId
      for (const call of missedCalls) {
        const callerId = call.callerId.toString();
        if (!missedCallsMap[callerId]) {
          missedCallsMap[callerId] = [];
        }
        missedCallsMap[callerId].push(call);
      }
    }

    // Batch load male users
    const maleUsers = await MaleUser.find({ _id: { $in: maleParticipantIds } })
      .select('firstName lastName images profileCompleted');
    
    // Create a map for quick lookup
    const maleUserMap = {};
    maleUsers.forEach(user => {
      maleUserMap[user._id.toString()] = user;
    });

    // Batch load male images
    const allImageIds = [];
    maleUsers.forEach(user => {
      if (user.images && user.images.length > 0) {
        allImageIds.push(user.images[0]); // Get first image of each user
      }
    });

    const MaleImage = require('../../models/maleUser/Image');
    const maleImages = await MaleImage.find({ _id: { $in: allImageIds } });
    const maleImageMap = {};
    maleImages.forEach(image => {
      maleImageMap[image._id.toString()] = image;
    });

    const importantChats = [];

    // Process each chat room with pre-loaded data
    for (const room of chatRooms) {
      const maleParticipant = maleParticipantMap[room._id.toString()];
      if (!maleParticipant) continue;

      const lastReadTime = roomLastReadTimeMap[room._id.toString()];

      const unreadMessages = unreadMessagesMap[room._id.toString()] || 0;
      const unreadMediaCount = unreadMediaMap[room._id.toString()] || 0;

      // Filter missed calls for this specific chat (room participant)
      const allMissedCallsForThisMale = missedCallsMap[maleParticipant.userId.toString()] || [];
      const missedCallsAfterLastRead = allMissedCallsForThisMale.filter(call => 
        call.createdAt > lastReadTime
      );
      const missedCallCount = missedCallsAfterLastRead.length;

      // Check if this chat should be marked as Important
      if (unreadMessages > 0 || unreadMediaCount > 0 || missedCallCount > 0) {
        const maleUser = maleUserMap[maleParticipant.userId.toString()];

        let profilePic = null;
        if (maleUser && maleUser.images && maleUser.images.length > 0) {
          const firstImageRef = maleUser.images[0];
          const imageDoc = maleImageMap[firstImageRef.toString()];
          if (imageDoc && imageDoc.imageUrl) {
            profilePic = imageDoc.imageUrl;
          }
        }

        // Get the last message from pre-loaded data
        const lastMessageDoc = lastMessagesMap[room._id.toString()];

        // Determine last message text and time (prioritize most recent event)
        let lastMessage = lastMessageDoc ? lastMessageDoc.content : '';
        let lastMessageAt = lastMessageDoc ? lastMessageDoc.createdAt : null;

        // Find the most recent missed call for this chat
        let lastMissedCall = null;
        if (missedCallsAfterLastRead.length > 0) {
          lastMissedCall = missedCallsAfterLastRead.reduce((latest, call) => 
            call.createdAt > latest.createdAt ? call : latest, 
            missedCallsAfterLastRead[0]
          );
        }

        // Update lastMessage and lastMessageAt if the missed call is more recent
        if (lastMissedCall && 
            (!lastMessageAt || lastMissedCall.createdAt > lastMessageAt)) {
          lastMessage = 'Missed call';
          lastMessageAt = lastMissedCall.createdAt;
        }

        importantChats.push({
          maleId: maleParticipant.userId,
          name: `${maleUser?.firstName || ''} ${maleUser?.lastName || ''}`.trim(),
          profilePic,
          unreadCount: unreadMessages,
          unreadMediaCount,
          missedCallCount,
          hasMedia: unreadMediaCount > 0,
          hasMissedCall: missedCallCount > 0,
          lastMessage,
          lastMessageAt
        });
      }
    }

    // Sort important chats with priority: missed calls > media > time
    importantChats.sort((a, b) => {
      // Missed calls highest priority
      if (a.hasMissedCall && !b.hasMissedCall) return -1;
      if (!a.hasMissedCall && b.hasMissedCall) return 1;

      // Then media
      if (a.hasMedia && !b.hasMedia) return -1;
      if (!a.hasMedia && b.hasMedia) return 1;

      // Then time
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json({ success: true, data: importantChats });
  } catch (error) {
    console.error('Error getting important chats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Top Fans for Female User
exports.getTopFans = async (req, res) => {
  try {
    const femaleId = req.user.id;

    // Get active config from admin
    const config = await getActiveConfigInternal();
    if (!config) {
      return res.status(500).json({
        success: false,
        message: 'Top Fan config not set by admin'
      });
    }

    // Find all chat rooms where female user is a participant
    const chatRooms = await ChatRoom.find({
      'participants.userId': femaleId,
      'isDeletedFor': { $ne: femaleId }
    });

    // Calculate scores for each male user
    const fanScores = {};

    // Process chat messages
    for (const room of chatRooms) {
      // Find the male participant in the room
      const maleParticipant = room.participants.find(
        participant => participant.userId.toString() !== femaleId.toString() && participant.userType === 'male'
      );

      if (!maleParticipant) continue;

      const maleId = maleParticipant.userId.toString();

      // Initialize fanScores entry if not exists
      if (!fanScores[maleId]) {
        fanScores[maleId] = {
          maleEffortScore: 0,
          femaleResponseScore: 0,
          lastInteractionAt: new Date(0),
          messageCount: 0  // Only male messages count toward effort
        };
      }

      // Get all messages from this room sorted by date
      const roomMessages = await Message.find({
        chatRoomId: room._id,
        'isDeletedFor': { $ne: femaleId }
      }).sort({ createdAt: 1 }); // Sort chronologically

      // Track last male message timestamp for fast reply bonus
      let lastMaleMessageAt = null;
      // Track if fast reply bonus has been awarded for this male message to prevent stacking
      let fastReplyAwardedForCurrentMaleMessage = false;

      // Process messages to calculate scores
      for (let i = 0; i < roomMessages.length; i++) {
        const message = roomMessages[i];

        if (message.senderType === 'male' && message.senderId.equals(maleParticipant.userId)) {
          // Calculate male effort score based on message type
          switch (message.type) {
            case 'text':
              fanScores[maleId].maleEffortScore += config.maleEffort.text;
              break;
            case 'image':
              fanScores[maleId].maleEffortScore += config.maleEffort.image;
              break;
            case 'video':
              fanScores[maleId].maleEffortScore += config.maleEffort.video;
              break;
            case 'audio':
              fanScores[maleId].maleEffortScore += config.maleEffort.voice;
              break;
          }
          
          // Update last male message timestamp
          lastMaleMessageAt = message.createdAt;
          
          // Reset fast reply flag for the new male message
          fastReplyAwardedForCurrentMaleMessage = false;
          
          // Only increment message count for male messages (not female replies)
          fanScores[maleId].messageCount++;
        } else if (message.senderType === 'female' && message.senderId.equals(femaleId)) {
          // Calculate female response score based on message type
          switch (message.type) {
            case 'text':
              fanScores[maleId].femaleResponseScore += config.femaleResponse.textReply;
              break;
            case 'audio':
              fanScores[maleId].femaleResponseScore += config.femaleResponse.voiceReply;
              break;
          }

          // Check for fast reply bonus (within 5 minutes of male message)
          // Only award once per male message to prevent stacking
          if (lastMaleMessageAt && 
              !fastReplyAwardedForCurrentMaleMessage &&
              (message.createdAt - lastMaleMessageAt) <= 5 * 60 * 1000 // 5 minutes
          ) {
            fanScores[maleId].femaleResponseScore += config.femaleResponse.fastReplyBonus;
            fastReplyAwardedForCurrentMaleMessage = true; // Prevent stacking
          }
        }

        // Update last interaction time if this message is newer
        if (message.createdAt > fanScores[maleId].lastInteractionAt) {
          fanScores[maleId].lastInteractionAt = message.createdAt;
        }
      }
    }

    // Process call history separately from messages
    const callHistories = await CallHistory.find({
      $or: [
        { callerId: { $in: Object.keys(fanScores) }, receiverId: femaleId },
        { callerId: femaleId, receiverId: { $in: Object.keys(fanScores) } }
      ]
    });

    // Add call-based scoring
    for (const call of callHistories) {
      // If male called female (male effort)
      if (call.callerId.toString() in fanScores && call.receiverId.equals(femaleId)) {
        const maleId = call.callerId.toString();
        
        // Only count calls if they were completed and had sufficient duration (to prevent spam)
        if (call.status === 'completed' && (call.duration || 0) >= 30) { // At least 30 seconds
          // Add male effort for making calls
          switch (call.callType) {
            case 'audio':
              fanScores[maleId].maleEffortScore += config.maleEffort.audioCall;
              break;
            case 'video':
              fanScores[maleId].maleEffortScore += config.maleEffort.videoCall;
              break;
          }
          
          // Count calls as effort messages too
          fanScores[maleId].messageCount++;
          
          // Update last interaction time if this call is newer
          if (call.createdAt > fanScores[maleId].lastInteractionAt) {
            fanScores[maleId].lastInteractionAt = call.createdAt;
          }
        }
      } 
      // If female called male (this is female's effort, NOT response to male effort)
      // This should NOT count toward female response score for Top Fans calculation
      // Top Fans is about "male effort welcomed by female", not "female reaching out"
    }

    // Apply anti-spam caps to male effort scores after recency decay calculation
    const MAX_EFFORT_PER_DAY = 1000; // Configurable limit
    for (const maleId in fanScores) {
      fanScores[maleId].maleEffortScore = Math.min(fanScores[maleId].maleEffortScore, MAX_EFFORT_PER_DAY);
    }

    // Calculate final scores using multipliers
    const topFansArray = Object.keys(fanScores).map(maleId => {
      const scores = fanScores[maleId];
      
      // Sort multipliers by min value to ensure proper range finding
      const sortedMultipliers = [...config.multipliers].sort((a, b) => a.min - b.min);
      
      // Find the appropriate multiplier based on female response score
      const multiplierRule = sortedMultipliers.find(
        m => scores.femaleResponseScore >= m.min && scores.femaleResponseScore <= m.max
      );
      // Use a safer fallback multiplier instead of 0 to prevent complete zeroing
      const multiplier = multiplierRule ? multiplierRule.factor : 0.3;
      
      // Calculate base final score: male effort * female response multiplier
      let finalScore = scores.maleEffortScore * multiplier;

      // Apply recency decay
      const daysSinceLast = (Date.now() - scores.lastInteractionAt) / (1000 * 60 * 60 * 24);
      const decay = daysSinceLast > 30 ? 0.5 : 1; // Reduce score by 50% if no interaction in 30+ days
      finalScore *= decay;

      return {
        maleId,
        maleEffortScore: scores.maleEffortScore,
        femaleResponseScore: scores.femaleResponseScore,
        multiplier,
        finalScore,
        messageCount: scores.messageCount,
        lastInteractionAt: scores.lastInteractionAt
      };
    });

    // Filter out users whose final score is below the minimum threshold
    const filteredTopFans = topFansArray.filter(fan => fan.finalScore >= config.minTopFanScore);

    // Sort by final score descending
    filteredTopFans.sort((a, b) => b.finalScore - a.finalScore);

    // Limit to top 10
    const topTenFans = filteredTopFans.slice(0, 10);

    // Batch load male users to improve performance
    if (topTenFans.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const maleIds = topTenFans.map(fan => fan.maleId);
    const maleUsers = await MaleUser.find({ _id: { $in: maleIds } })
      .select('firstName lastName images profileCompleted');

    // Create a map for quick lookup
    const maleUserMap = {};
    maleUsers.forEach(user => {
      maleUserMap[user._id.toString()] = user;
    });

    // Add user profile information
    const topFansWithProfiles = await Promise.all(topTenFans.map(async (fan) => {
      const maleUser = maleUserMap[fan.maleId];

      let profilePic = null;
      if (maleUser && maleUser.images && maleUser.images.length > 0) {
        const MaleImage = require('../../models/maleUser/Image');
        const firstImageRef = maleUser.images[0];
        const imageDoc = await MaleImage.findById(firstImageRef);
        if (imageDoc && imageDoc.imageUrl) {
          profilePic = imageDoc.imageUrl;
        }
      }

      return {
        maleId: fan.maleId,
        name: `${maleUser?.firstName || ''} ${maleUser?.lastName || ''}`.trim(),
        profilePic,
        score: Math.round(fan.finalScore), // Rounded final score
        maleEffortScore: fan.maleEffortScore,
        femaleResponseScore: fan.femaleResponseScore,
        multiplier: fan.multiplier,
        messageCount: fan.messageCount,
        lastInteractionAt: fan.lastInteractionAt
      };
    }));

    res.json({ success: true, data: topFansWithProfiles });
  } catch (error) {
    console.error('Error getting top fans:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};