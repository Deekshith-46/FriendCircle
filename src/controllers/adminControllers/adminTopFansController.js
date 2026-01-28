const ChatRoom = require('../../models/chat/ChatRoom');
const Message = require('../../models/chat/Message');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const CallHistory = require('../../models/common/CallHistory');
const { getActiveConfigInternal } = require('./topFanConfigController');

// Get Top Fans for a specific female user (admin view)
exports.getTopFansForFemale = async (req, res) => {
  try {
    const { femaleId } = req.params;

    // Validate that the femaleId exists
    const femaleUser = await FemaleUser.findById(femaleId);
    if (!femaleUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Female user not found' 
      });
    }

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

    // Sort by final score descending
    topFansArray.sort((a, b) => b.finalScore - a.finalScore);

    // Limit to top 20 for admin view (more than user view)
    // Include ALL users who had interactions, regardless of minTopFanScore
    const topTwentyFans = topFansArray
      .filter(fan => fan.maleEffortScore > 0 || fan.femaleResponseScore > 0) // Only show users with actual interactions
      .slice(0, 20);

    // Batch load male users to improve performance
    if (topTwentyFans.length === 0) {
      res.json({ success: true, data: [], femaleUser: { id: femaleId, name: femaleUser.name } });
      return;
    }

    const maleIds = topTwentyFans.map(fan => fan.maleId);
    const maleUsers = await MaleUser.find({ _id: { $in: maleIds } })
      .select('firstName lastName email phoneNumber createdAt');

    // Create a map for quick lookup
    const maleUserMap = {};
    maleUsers.forEach(user => {
      maleUserMap[user._id.toString()] = user;
    });

    // Add user profile information
    const topFansWithProfiles = topTwentyFans.map(fan => {
      const maleUser = maleUserMap[fan.maleId];

      return {
        maleId: fan.maleId,
        name: `${maleUser?.firstName || ''} ${maleUser?.lastName || ''}`.trim() || 'Unknown User',
        email: maleUser?.email || 'No email',
        phone: maleUser?.phoneNumber || 'No phone',
        joinedAt: maleUser?.createdAt || 'Unknown',
        score: Math.round(fan.finalScore), // Rounded final score
        maleEffortScore: fan.maleEffortScore,
        femaleResponseScore: fan.femaleResponseScore,
        multiplier: fan.multiplier,
        messageCount: fan.messageCount,
        lastInteractionAt: fan.lastInteractionAt,
        qualified: fan.finalScore >= config.minTopFanScore, // Show if this user meets the minTopFanScore requirement
        suspicious: fan.maleEffortScore > 500 // Flag potentially suspicious high effort
      };
    });

    res.json({ 
      success: true, 
      data: topFansWithProfiles,
      femaleUser: { 
        id: femaleId, 
        name: femaleUser.name,
        email: femaleUser.email 
      },
      configUsed: {
        minTopFanScore: config.minTopFanScore,
        maleEffort: config.maleEffort,
        femaleResponse: config.femaleResponse
      }
    });
  } catch (error) {
    console.error('Error getting top fans for female:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Top Fans summary for all female users (admin dashboard)
exports.getTopFansSummary = async (req, res) => {
  try {
    // Get sample of female users to show top fans summary
    const femaleUsers = await FemaleUser.find({})
      .select('name email _id createdAt')
      .limit(50); // Limit for performance

    const summary = femaleUsers.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      joinedAt: user.createdAt
    }));

    res.json({ 
      success: true, 
      data: summary,
      total: femaleUsers.length
    });
  } catch (error) {
    console.error('Error getting top fans summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};