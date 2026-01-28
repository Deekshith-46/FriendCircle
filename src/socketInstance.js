let io = null;

// Socket presence tracking
const socketPresence = new Map(); // userId:userType -> socketId
const userSocketMap = new Map(); // socketId -> { userId, userType }

module.exports = {
  setIO: (ioInstance) => {
    io = ioInstance;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    return io;
  },
  
  // Presence tracking methods
  addUserSocket: (userId, userType, socketId) => {
    const key = `${userId}:${userType}`;
    socketPresence.set(key, socketId);
    userSocketMap.set(socketId, { userId, userType });
    console.log(`👤 Added socket presence: ${key} -> ${socketId}`);
  },
  
  removeUserSocket: (socketId) => {
    const userInfo = userSocketMap.get(socketId);
    if (userInfo) {
      const key = `${userInfo.userId}:${userInfo.userType}`;
      socketPresence.delete(key);
      userSocketMap.delete(socketId);
      console.log(`👤 Removed socket presence: ${key} <- ${socketId}`);
    }
  },
  
  getSocketIdForUser: (userId, userType) => {
    const key = `${userId}:${userType}`;
    return socketPresence.get(key);
  },
  
  isUserOnline: (userId, userType) => {
    return socketPresence.has(`${userId}:${userType}`);
  },
  
  getAllOnlineUsers: () => {
    const onlineUsers = [];
    for (const [key, socketId] of socketPresence.entries()) {
      const [userId, userType] = key.split(':');
      onlineUsers.push({ userId, userType, socketId });
    }
    return onlineUsers;
  },
  
  getSocketPresence: () => {
    return socketPresence;
  },
  
  getUserSocketMap: () => {
    return userSocketMap;
  }
};