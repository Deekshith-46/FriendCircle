const socketIO = require('socket.io');
const Message = require('./models/chat/Message');
const ChatRoom = require('./models/chat/ChatRoom');
const FemaleUser = require('./models/femaleUser/FemaleUser');
const MaleUser = require('./models/maleUser/MaleUser');
const { setIO, addUserSocket, removeUserSocket, getIO } = require('./socketInstance');

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*'
    }
  });

  setIO(io); // Store the io instance globally

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle authentication
    socket.on('authenticate', async (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database to confirm user type (security hardening)
        const FemaleUser = require('./models/femaleUser/FemaleUser');
        const MaleUser = require('./models/maleUser/MaleUser');
        const AdminUser = require('./models/admin/AdminUser');
        const AgencyUser = require('./models/agency/AgencyUser');

        let user;
        let userType;

        // Try to find user in different collections
        user = await FemaleUser.findById(decoded.id);
        if (user) {
          userType = 'female';
        } else {
          user = await MaleUser.findById(decoded.id);
          if (user) {
            userType = 'male';
          } else {
            user = await AdminUser.findById(decoded.id);
            if (user) {
              userType = 'admin';
            } else {
              user = await AgencyUser.findById(decoded.id);
              if (user) {
                userType = 'agency';
              }
            }
          }
        }

        if (!user) {
          throw new Error('User not found');
        }

        socket.userId = decoded.id;
        socket.userType = userType;

        // Add to presence tracking
        addUserSocket(socket.userId, socket.userType, socket.id);
        
        // Update user's online status in database
        if (userType === 'female') {
          await FemaleUser.findByIdAndUpdate(decoded.id, { 
            onlineStatus: true,
            lastSeen: new Date()
          });
        } else if (userType === 'male') {
          await MaleUser.findByIdAndUpdate(decoded.id, { 
            onlineStatus: true,
            lastSeen: new Date()
          });
        }

        socket.emit('authenticated', { success: true });
        
        // Join user-specific notification room
        const notificationRoom = `${userType}_${decoded.id}`;
        socket.join(notificationRoom);
        console.log(`User ${socket.id} joined notification room: ${notificationRoom}`);
        
        // For admin users, also join admins_room
        if (userType === 'admin') {
          socket.join('admins_room');
          console.log(`Admin ${socket.id} joined admins_room`);
        }
        
        // Broadcast user's online status to their contacts
        broadcastUserStatus(socket.userId, socket.userType, true);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_error', { message: 'Invalid token' });
        socket.disconnect();
      }
    });

    // Join chat room
    socket.on('joinRoom', (roomId) => {
      if (!socket.userId || !socket.userType) {
        socket.emit('error', { message: 'Authentication required before joining room' });
        return;
      }
      socket.join(roomId);
      console.log(`User ${socket.id} (type: ${socket.userType}) joined room ${roomId}`);
    });

    // Send message
    socket.on('sendMessage', async (data) => {
      try {
        const {
          roomId,
          type,
          content
        } = data;

        // Use authenticated socket user instead of client-provided values
        const senderId = socket.userId;
        const senderType = socket.userType;

        if (!senderId || !senderType) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const room = await ChatRoom.findOne({
          _id: roomId,
          'participants.userId': senderId
        });

        if (!room) {
          socket.emit('error', { message: 'Chat room not found or unauthorized' });
          return;
        }

        let expireAt = null;
        if (room.isDisappearing) {
          expireAt = new Date(
            Date.now() + room.disappearingAfterHours * 60 * 60 * 1000
          );
        }

        const message = await Message.create({
          chatRoomId: roomId,
          senderId,
          senderType,
          type,
          content,
          expireAt,
          // Initialize read status as not read by anyone initially
          readBy: []
        });

        // Update unread counts for the recipient
        const senderParticipant = room.participants.find(p => p.userId.toString() === senderId.toString());
        if (senderParticipant) {
          // Find the other participant to increment their unread count
          const otherParticipant = room.participants.find(p => p.userId.toString() !== senderId.toString());
          if (otherParticipant) {
            // Increment unread count for the recipient using userId as key
            await ChatRoom.updateOne(
              { _id: roomId },
              { $inc: { [`unreadMap.${otherParticipant.userId}`]: 1 } }
            );
          }
        }

        // Update last message
        room.lastMessage = content;
        room.lastMessageAt = new Date();
        await room.save();

        // Check if the recipient is online and mark as delivered
        const otherParticipant = room.participants.find(p => p.userId.toString() !== senderId.toString());
        if (otherParticipant) {
          const recipientSocketId = require('./socketInstance').getSocketIdForUser(
            otherParticipant.userId.toString(),
            otherParticipant.userType
          );
          
          if (recipientSocketId) {
            // Recipient is online, mark message as delivered
            await Message.updateOne(
              { _id: message._id },
              {
                $addToSet: {
                  deliveredTo: {
                    userId: otherParticipant.userId,
                    userType: otherParticipant.userType,
                    deliveredAt: new Date()
                  }
                }
              }
            );
          }
        }
        
        // Emit message to room
        io.to(roomId).emit('newMessage', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Mark message as read (supports both single and bulk)
    socket.on('markAsRead', async (data) => {
      try {
        const {
          roomId,
          messageIds
        } = data;

        // Handle both single messageId (backward compatibility) and array of messageIds
        let idsToProcess = [];
        if (messageIds) {
          idsToProcess = Array.isArray(messageIds) ? messageIds : [messageIds];
        } else if (data.messageId) {
          // Check if messageId is an array or single value
          idsToProcess = Array.isArray(data.messageId) ? data.messageId : [data.messageId];
        }

        if (!idsToProcess || idsToProcess.length === 0) {
          socket.emit('error', { message: 'messageIds array is required' });
          return;
        }

        // Use authenticated socket user instead of client-provided values
        const userId = socket.userId;
        const userType = socket.userType;

        if (!userId || !userType) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const room = await ChatRoom.findOne({
          _id: roomId,
          'participants.userId': userId
        });

        if (!room) {
          socket.emit('error', { message: 'Chat room not found or unauthorized' });
          return;
        }

        // Find messages that belong to the room, sent by other users, and not already read by this user
        const messages = await Message.find({
          _id: { $in: idsToProcess },
          chatRoomId: roomId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        });

        if (messages.length > 0) {
          // Update all messages with read status
          for (const message of messages) {
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

          // Update the room's last read time for this user
          // Remove old entry first to avoid conflicts
          await ChatRoom.updateOne(
            { _id: roomId },
            { $pull: { lastReadBy: { userId: userId } } }
          );

          // Add new entry
          await ChatRoom.updateOne(
            { _id: roomId },
            {
              $push: {
                lastReadBy: {
                  userId: userId,
                  userType: userType,
                  lastReadAt: new Date()
                }
              }
            }
          );

          // Emit read receipt to room (supporting bulk)
          io.to(roomId).emit('messageRead', {
            roomId,
            messageIds: messages.map(m => m._id.toString()),
            readerId: userId,
            readerType: userType,
            timestamp: new Date()
          });
          // Recalculate unread count for the user who read the messages
          const userParticipant = room.participants.find(p => p.userId.toString() === userId.toString());
          if (userParticipant) {
            // Find the latest message among those marked as read to use as the new last read time
            const latestMessage = await Message.findOne({
              _id: { $in: messages.map(m => m._id) },
              chatRoomId: roomId,
              senderId: { $ne: userId }
            }).sort({ createdAt: -1 });
            
            // Use the latest message's creation time as the new last read time
            const newLastReadTime = latestMessage ? latestMessage.createdAt : new Date();
            
            // Count messages from other users that were sent after the new last read time
            const newUnreadCount = await Message.countDocuments({
              chatRoomId: roomId,
              senderId: { $ne: userId },
              isDeletedFor: { $ne: userId },
              createdAt: { $gt: newLastReadTime }
            });

            await ChatRoom.updateOne(
              { _id: roomId },
              { 
                $set: { 
                  [`unreadMap.${userId}`]: newUnreadCount,
                  [`lastReadMap.${userId}`]: newLastReadTime
                }
              }
            );
          }

        }
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove from presence tracking
      removeUserSocket(socket.id);
      
      // Update user's online status in database and set last seen time
      if (socket.userId && socket.userType) {
        if (socket.userType === 'female') {
          FemaleUser.findByIdAndUpdate(socket.userId, { 
            onlineStatus: false,
            lastSeen: new Date()
          }).catch(console.error);
        } else if (socket.userType === 'male') {
          MaleUser.findByIdAndUpdate(socket.userId, { 
            onlineStatus: false,
            lastSeen: new Date()
          }).catch(console.error);
        }
      
        // Broadcast user's offline status to their contacts
        broadcastUserStatus(socket.userId, socket.userType, false);
      }
    });

    socket.on("deleteMessage", async ({ messageId }) => {
      await Message.findByIdAndDelete(messageId);
      io.emit("messageDeleted", { messageId });
    });

    // Handle call ended event
    socket.on('call_ended', async (data) => {
      try {
        const { callId, endedBy } = data;
        
        if (!callId) {
          socket.emit('error', { message: 'Call ID is required' });
          return;
        }
        
        // Find the call session to get the participants
        const CallSession = require('./models/common/CallSession');
        const callSession = await CallSession.findOne({ callId });
        
        if (!callSession) {
          socket.emit('error', { message: 'Call session not found' });
          return;
        }
        
        // Determine the other participant
        let otherUserId, otherUserType;
        if (socket.userId.toString() === callSession.callerId.toString()) {
          otherUserId = callSession.receiverId;
          otherUserType = 'female';
        } else if (socket.userId.toString() === callSession.receiverId.toString()) {
          otherUserId = callSession.callerId;
          otherUserType = 'male';
        } else {
          socket.emit('error', { message: 'User not part of this call' });
          return;
        }
        
        // Get the other user's socket ID
        const otherUserSocketId = require('./socketInstance').getSocketIdForUser(
          otherUserId.toString(),
          otherUserType
        );
        
        if (otherUserSocketId) {
          // Emit call ended event to the other user
          io.to(otherUserSocketId).emit('call_ended', {
            callId,
            endedBy: socket.userId.toString(),
            endedByType: socket.userType,
            timestamp: new Date()
          });
        }
        
        // Emit confirmation back to the user who ended the call
        socket.emit('call_end_confirmed', {
          callId,
          success: true
        });
        
      } catch (error) {
        console.error('Error handling call ended event:', error);
        socket.emit('error', { message: 'Failed to handle call ended event' });
      }
    });

  });

  return io;
};

// Helper function to broadcast user status to contacts
async function broadcastUserStatus(userId, userType, isOnline) {
  try {
    // Find all chat rooms where this user is a participant
    const rooms = await ChatRoom.find({
      'participants.userId': userId
    }).populate('participants.userId', 'name firstName lastName');

    // For each room, notify the other participant about the status change
    for (const room of rooms) {
      const otherParticipant = room.participants.find(p => 
        p.userId.toString() !== userId.toString()
      );
      
      if (otherParticipant) {
        const io = getIO();
        // Check if the other user is online
        const otherUserSocketId = require('./socketInstance').getSocketIdForUser(
          otherParticipant.userId._id.toString(),
          otherParticipant.userType
        );
        
        if (otherUserSocketId) {
          // Send status update to the other user
          io.to(otherUserSocketId).emit('userStatusChanged', {
            userId: userId.toString(),
            userType: userType,
            isOnline: isOnline,
            lastSeen: isOnline ? null : new Date(),
            timestamp: new Date()
          });
        }
      }
    }
  } catch (error) {
    console.error('Error broadcasting user status:', error);
  }
}
