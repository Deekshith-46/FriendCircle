// src/models/common/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel',
    required: true
  },
  receiverModel: {
    type: String,
    required: true,
    enum: ['Admin', 'MaleUser', 'FemaleUser', 'AgencyUser']
  },
  receiverType: {
    type: String,
    required: true,
    enum: ['admin', 'male', 'female', 'agency']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'ACCOUNT_APPROVAL_REQUEST', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 
      'ACCOUNT_DEACTIVATED', 'ACCOUNT_ACTIVATED', 'KYC_SUBMITTED', 
      'KYC_APPROVED', 'KYC_REJECTED', 'KYC_RE_SUBMITTED', 'WITHDRAWAL_REQUEST',
      'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'WITHDRAWAL_PROCESSED',
      'CHAT_MESSAGE', 'CHAT_UNREAD_COUNT', 'CHAT_TYPING', 'CHAT_DELIVERED',
      'CHAT_READ', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED',
      'SYSTEM_MAINTENANCE', 'SYSTEM_UPDATE', 'FEATURE_ANNOUNCEMENT'
    ]
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  isSeen: {
    type: Boolean,
    default: false
  },
  seenAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ receiverId: 1, receiverModel: 1, createdAt: -1 });
notificationSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);