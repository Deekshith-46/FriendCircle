const { sendSocketNotification, sendNotificationWithIntent } = require('./socketSender');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const AgencyUser = require('../../models/agency/AgencyUser');
const ChatRoom = require('../../models/chat/ChatRoom');

// Get user name for chat notifications
const getUserName = async (userId, userType) => {
  try {
    let user = null;
    let name = '';

    if (userType === 'male') {
      // For male users, we'll need to import MaleUser model
      const MaleUser = require('../../models/maleUser/MaleUser');
      user = await MaleUser.findById(userId).select('firstName lastName');
      if (user) {
        name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Male User';
      }
    } else if (userType === 'female') {
      user = await FemaleUser.findById(userId).select('name');
      if (user) {
        name = user.name || 'Female User';
      }
    } else if (userType === 'agency') {
      user = await AgencyUser.findById(userId).select('firstName lastName');
      if (user) {
        name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agency User';
      }
    }

    return name;
  } catch (error) {
    console.error('Error getting user name:', error);
    return userType === 'male' ? 'Male User' : userType === 'female' ? 'Female User' : 'Agency User';
  }
};

// Get message preview for notifications
const getMessagePreview = (messageData) => {
  const { type, content } = messageData;
  
  switch (type) {
    case 'text':
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    case 'image':
      return '📷 Image';
    case 'video':
      return '🎥 Video';
    case 'audio':
      return '🎵 Audio';
    default:
      return 'New message';
  }
};

// Send chat notification to receiver
const sendChatNotification = async (senderId, senderType, receiverId, receiverType, messageData, roomId) => {
  try {
    // Get sender name
    const senderName = await getUserName(senderId, senderType);
    
    // Prepare notification payload
    const payload = {
      title: `New message from ${senderName}`,
      body: getMessagePreview(messageData),
      data: {
        type: 'chat_message',
        senderId: senderId.toString(),
        senderType,
        receiverId: receiverId.toString(),
        receiverType,
        roomId: roomId.toString(),
        messageId: messageData._id?.toString() || '',
        timestamp: new Date().toISOString()
      }
    };

    // Send notification with delivery intent
    // For chat messages, we assume user is not actively in the chat room
    // (this would be determined by frontend presence logic)
    const result = await sendNotificationWithIntent(
      receiverId,
      receiverType,
      payload.title,
      payload.body,
      payload.data,
      false // userActiveInRoom = false for chat notifications
    );

    return result;
  } catch (error) {
    console.error('Error sending chat notification:', error);
    return { db: false, socket: null, push: null, error: error.message };
  }
};

// Send room notification to all participants except sender
const sendRoomNotification = async (senderId, senderType, roomId, messageData) => {
  try {
    const room = await ChatRoom.findById(roomId).populate('participants.user');
    
    if (!room) {
      console.log('Room not found for notification');
      return { success: false, reason: 'Room not found' };
    }

    const senderName = await getUserName(senderId, senderType);
    const messagePreview = getMessagePreview(messageData);

    const results = [];

    for (const participant of room.participants) {
      // Skip sender
      if (participant.user._id.toString() === senderId.toString()) {
        continue;
      }

      const payload = {
        title: `New message in ${room.roomName || 'chat'}`,
        body: `${senderName}: ${messagePreview}`,
        data: {
          type: 'room_message',
          senderId: senderId.toString(),
          senderType,
          roomId: roomId.toString(),
          messageId: messageData._id?.toString() || '',
          roomName: room.roomName || 'Chat Room',
          timestamp: new Date().toISOString()
        }
      };

      const result = await sendNotificationWithIntent(
        participant.user._id,
        participant.userType,
        payload.title,
        payload.body,
        payload.data,
        false // userActiveInRoom = false
      );

      results.push({
        userId: participant.user._id,
        userType: participant.userType,
        result
      });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error sending room notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendChatNotification,
  sendRoomNotification,
  getUserName,
  getMessagePreview
};