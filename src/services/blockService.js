const FemaleBlockList = require('../models/femaleUser/BlockList');
const MaleBlockList = require('../models/maleUser/BlockList');
const AgencyBlockList = require('../models/agency/BlockList');

/**
 * Check if two users have blocked each other
 */
const isBlocked = async (userId, userType, otherUserId, otherUserType) => {
  try {
    // Check if user has blocked other
    let userBlocksOther = false;
    
    if (userType === 'male') {
      userBlocksOther = await MaleBlockList.findOne({ 
        maleUserId: userId, 
        blockedUserId: otherUserId 
      });
    } else if (userType === 'female') {
      userBlocksOther = await FemaleBlockList.findOne({ 
        femaleUserId: userId, 
        blockedUserId: otherUserId 
      });
    } else if (userType === 'agency') {
      userBlocksOther = await AgencyBlockList.findOne({ 
        agencyUserId: userId, 
        blockedUserId: otherUserId 
      });
    }

    // Check if other has blocked user
    let otherBlocksUser = false;
    
    if (otherUserType === 'male') {
      otherBlocksUser = await MaleBlockList.findOne({ 
        maleUserId: otherUserId, 
        blockedUserId: userId 
      });
    } else if (otherUserType === 'female') {
      otherBlocksUser = await FemaleBlockList.findOne({ 
        femaleUserId: otherUserId, 
        blockedUserId: userId 
      });
    } else if (otherUserType === 'agency') {
      otherBlocksUser = await AgencyBlockList.findOne({ 
        agencyUserId: otherUserId, 
        blockedUserId: userId 
      });
    }

    return {
      userBlockedOther: !!userBlocksOther,
      otherBlockedUser: !!otherBlocksUser,
      isBlocked: !!(userBlocksOther || otherBlocksUser)
    };
  } catch (err) {
    console.error('Error checking block status:', err);
    return {
      userBlockedOther: false,
      otherBlockedUser: false,
      isBlocked: false,
      error: err.message
    };
  }
};

/**
 * Check relationship permissions (separate from blocking)
 */
const checkRelationshipPermission = async (senderId, senderType, receiverId, receiverType) => {
  try {
    // Check if either user has blocked the other
    const blockResult = await isBlocked(senderId, senderType, receiverId, receiverType);

    if (blockResult.isBlocked) {
      return {
        allowed: false,
        reason: 'BLOCKED_USER'
      };
    }

    // Only male → female case supported
    if (senderType === 'male' && receiverType === 'female') {
      const followRecord = await require('../models/common/FollowRequest').findOne({
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
      const FemaleUser = require('../models/femaleUser/FemaleUser');
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
    console.error('Error checking relationship permission:', error);
    return {
      allowed: false,
      reason: 'ERROR'
    };
  }
};

module.exports = {
  isBlocked,
  checkRelationshipPermission
};