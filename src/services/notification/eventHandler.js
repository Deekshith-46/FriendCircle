const notificationEvents = require('../../constants/notificationEvents');
const AdminUser = require('../../models/admin/AdminUser');
const { saveNotification } = require('./notificationStorage');

// Helper to get admin ID
const getAdminId = async () => {
  const admin = await AdminUser.findOne({ role: 'admin' }).select('_id');
  return admin ? admin._id.toString() : null;
};

// Event handler functions
const handleAccountApprovalRequest = async (payload) => {
  const { entityId, entityType } = payload;
  const userId = payload.userId || entityId;
  const userType = payload.userType || entityType;
  
  return {
    receiverId: await getAdminId(),
    receiverType: 'admin',
    title: 'New Account Pending Approval',
    message: `New ${entityType} account waiting for approval`,
    type: notificationEvents.ACCOUNT_APPROVAL_REQUEST,
    data: { userId, userType, ...payload },
    priority: 'high'
  };
};

const handleAccountApproved = async (payload) => {
  const { userId, userType } = payload;
  const entityId = payload.entityId || userId;
  const entityType = payload.entityType || userType;
  
  return {
    receiverId: userId,
    receiverType: userType,
    title: 'Account Approved! 🎉',
    message: 'Your account has been approved. You can now login and start using the app.',
    type: notificationEvents.ACCOUNT_APPROVED,
    data: { userId, userType, approvedBy: payload.approvedBy },
    priority: 'medium'
  };
};

const handleKYCSubmitted = async (payload) => {
  const { userId, userType } = payload;
  const entityId = payload.entityId || userId;
  const entityType = payload.entityType || userType;
  
  return {
    receiverId: null, // Future-proof: null for admin group
    receiverType: 'admin', // All admins will receive this
    title: 'KYC Document Submitted',
    message: `${userType} user submitted KYC documents for verification`,
    type: notificationEvents.KYC_SUBMITTED,
    data: { userId, userType, ...payload },
    priority: 'high'
  };
};

const handleKYCProcessed = async (payload, eventType) => {
  const { userId, userType, processedBy, status } = payload;
  const entityId = payload.entityId || userId;
  const entityType = payload.entityType || userType;
  
  let message = 'Your KYC has been verified ✅';
  if (eventType === notificationEvents.KYC_REJECTED) {
    message = 'Your KYC has been rejected. Please check your documents and resubmit.';
  }
  
  return {
    receiverId: userId,
    receiverType: userType,
    title: `KYC ${status}`,
    message,
    type: eventType,
    data: { userId, userType, processedBy, status },
    priority: 'high'
  };
};

const handleWithdrawalRequest = async (payload) => {
  const { userId, userType, amount } = payload;
  const entityId = payload.entityId || userId;
  const entityType = payload.entityType || userType;
  
  return {
    receiverId: null, // Future-proof: null for admin group
    receiverType: 'admin', // All admins will receive this
    title: 'New Withdrawal Request',
    message: `${userType} user requested withdrawal of ₹${amount}`,
    type: notificationEvents.WITHDRAWAL_REQUEST,
    data: { userId, userType, amount, ...payload },
    priority: 'high'
  };
};

const handleWithdrawalProcessed = async (payload, eventType) => {
  const { userId, userType, amount, processedBy, status } = payload;
  const entityId = payload.entityId || userId;
  const entityType = payload.entityType || userType;
  
  let message = 'Your withdrawal has been processed 💸';
  if (eventType === notificationEvents.WITHDRAWAL_REJECTED) {
    message = `Your withdrawal of ₹${amount} has been rejected.`;
  }
  
  return {
    receiverId: userId,
    receiverType: userType,
    title: `Withdrawal ${status}`,
    message,
    type: eventType,
    data: { userId, userType, amount, processedBy, status },
    priority: 'medium'
  };
};

// Main event handler - returns notification data without saving
const handleEvent = async (eventType, payload) => {
  try {
    let notificationData = null;
    
    switch (eventType) {
      case notificationEvents.ACCOUNT_APPROVAL_REQUEST:
        notificationData = await handleAccountApprovalRequest(payload);
        break;
        
      case notificationEvents.ACCOUNT_APPROVED:
        notificationData = await handleAccountApproved(payload);
        break;
        
      case notificationEvents.KYC_SUBMITTED:
        notificationData = await handleKYCSubmitted(payload);
        break;
        
      case notificationEvents.KYC_APPROVED:
      case notificationEvents.KYC_REJECTED:
        notificationData = await handleKYCProcessed(payload, eventType);
        break;
        
      case notificationEvents.WITHDRAWAL_REQUEST:
        notificationData = await handleWithdrawalRequest(payload);
        break;
        
      case notificationEvents.WITHDRAWAL_APPROVED:
      case notificationEvents.WITHDRAWAL_REJECTED:
        notificationData = await handleWithdrawalProcessed(payload, eventType);
        break;
        
      default:
        console.log(`Unknown event type: ${eventType}`);
        return null;
    }
    
    return notificationData;
  } catch (error) {
    console.error('Error handling notification event:', error);
    return null;
  }
};

module.exports = {
  handleEvent,
  handleAccountApprovalRequest,
  handleAccountApproved,
  handleKYCSubmitted,
  handleKYCProcessed,
  handleWithdrawalRequest,
  handleWithdrawalProcessed,
  getAdminId
};