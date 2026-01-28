const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['male', 'female', 'agency'],
        required: true
      }
    }
  ],

  isDisappearing: {
    type: Boolean,
    default: false
  },

  disappearingAfterHours: {
    type: Number,
    default: 24
  },

  lastMessage: {
    type: String
  },

  lastMessageAt: {
    type: Date
  },

  roomKey: {
    type: String,
    unique: true,
    index: true
  },

  isDeletedFor: [
    {
      type: mongoose.Schema.Types.ObjectId
    }
  ],

  lastReadBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['male', 'female', 'agency'],
        required: true
      },
      lastReadAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  disappearingEnabledBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId
    },
    userType: {
      type: String,
      enum: ['male', 'female', 'agency']
    },
    enabledAt: {
      type: Date,
      default: Date.now
    }
  },

  // Unread count tracking - deprecated but kept for backward compatibility
  unreadCount: {
    type: Number,
    default: 0
  },

  // New unread tracking using maps for better accuracy - keyed by userId
  unreadMap: {
    type: Map,
    of: Number,
    default: {}
  },

  // Last read timestamp tracking for each user - keyed by userId
  lastReadMap: {
    type: Map,
    of: Date,
    default: {}
  }

}, { timestamps: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);