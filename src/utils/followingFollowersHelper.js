const MaleUser = require('../models/maleUser/MaleUser');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const MaleFollowing = require('../models/maleUser/Following');
const MaleFollowers = require('../models/maleUser/Followers');
const FemaleFollowing = require('../models/femaleUser/Following');
const FemaleFollowers = require('../models/femaleUser/Followers');
const BlockList = require('../models/maleUser/BlockList');
const FemaleBlockList = require('../models/femaleUser/BlockList');
const CallHistory = require('../models/common/CallHistory');
const GiftReceived = require('../models/femaleUser/GiftReceived');

/**
 * Helper function to calculate age from date of birth
 */
const calculateAgeFromDOB = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age > 0 ? age : null;
};

/**
 * Get earnings breakdown for specific male users
 */
const getEarningsBreakdownByMaleIds = async (femaleId, maleIds) => {
  if (!maleIds || maleIds.length === 0) {
    return [];
  }

  // Convert femaleId to ObjectId if it's not already
  const femaleObjectId = typeof femaleId === 'string' ? require('mongoose').Types.ObjectId(femaleId) : femaleId;

  // Get call earnings for each male user
  const callEarnings = await CallHistory.aggregate([
    {
      $match: {
        receiverId: femaleObjectId,
        callerId: { $in: maleIds.map(id => typeof id === 'string' ? require('mongoose').Types.ObjectId(id) : id) },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$callerId',
        totalCallEarnings: { $sum: '$femaleEarning' },
        totalCalls: { $sum: 1 }
      }
    }
  ]);

  // Get gift earnings for each male user
  const giftEarnings = await GiftReceived.aggregate([
    {
      $match: {
        receiverId: femaleObjectId,
        senderId: { $in: maleIds.map(id => typeof id === 'string' ? require('mongoose').Types.ObjectId(id) : id) }
        // Note: GiftReceived model doesn't have a status field by default
        // If needed, we'd need to add status field to GiftReceived model
      }
    },
    {
      $group: {
        _id: '$senderId',
        totalGiftEarnings: { $sum: '$coinsSpent' },
        totalGifts: { $sum: 1 }
      }
    }
  ]);

  // Create maps for easy lookup
  const callEarningsMap = {};
  callEarnings.forEach(item => {
    callEarningsMap[item._id.toString()] = {
      callCoins: item.totalCallEarnings || 0,
      calls: item.totalCalls || 0,
      tips: 0 // No tip earnings for now
    };
  });

  const giftEarningsMap = {};
  giftEarnings.forEach(item => {
    giftEarningsMap[item._id.toString()] = {
      giftCoins: item.totalGiftEarnings || 0,
      gifts: item.totalGifts || 0
    };
  });

  // Combine earnings data
  const earningsData = [];
  const allUniqueMaleIds = new Set([...maleIds.map(id => id.toString())]);
  
  allUniqueMaleIds.forEach(maleId => {
    const callData = callEarningsMap[maleId] || { callCoins: 0, calls: 0, tips: 0 };
    const giftData = giftEarningsMap[maleId] || { giftCoins: 0, gifts: 0 };
    
    const totalEarnings = callData.callCoins + giftData.giftCoins;
    
    earningsData.push({
      maleId,
      earnings: {
        total: totalEarnings,
        calls: callData.calls,
        callCoins: callData.callCoins,
        gifts: giftData.gifts,
        giftCoins: giftData.giftCoins,
        tips: callData.tips
      }
    });
  });

  return earningsData;
};

/**
 * Get detailed following list for female users
 */
const getDetailedFollowingList = async (userId, userType) => {
  let followingList = [];
  let blockedByCurrentUserIds = [];
  let blockedByOthersIds = [];

  if (userType === 'male') {
    // Get list of users that the current male user has blocked
    const blockedByCurrentUser = await BlockList.find({ maleUserId: userId }).select('blockedUserId');
    blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current male user
    const blockedByOthers = await FemaleBlockList.find({ blockedUserId: userId }).select('femaleUserId');
    blockedByOthersIds = blockedByOthers.map(block => block.femaleUserId);

    // Get following list for male user (female users the male is following)
    followingList = await MaleFollowing.find({ 
      maleUserId: userId,
      femaleUserId: { 
        $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds]
      }
    }).populate({
      path: 'femaleUserId',
      populate: {
        path: 'images',
        model: 'FemaleImage',
        select: 'imageUrl createdAt updatedAt'
      }
    }).select('femaleUserId dateFollowed');
  } else if (userType === 'female') {
    // Get list of users that the current female user has blocked
    const blockedByCurrentUser = await FemaleBlockList.find({ femaleUserId: userId }).select('blockedUserId');
    blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current female user
    const blockedByOthers = await BlockList.find({ blockedUserId: userId }).select('maleUserId');
    blockedByOthersIds = blockedByOthers.map(block => block.maleUserId);

    // Get following list for female user (male users the female is following)
    followingList = await FemaleFollowing.find({ 
      femaleUserId: userId,
      maleUserId: { 
        $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds]
      }
    }).populate({
      path: 'maleUserId',
      populate: {
        path: 'images',
        model: 'MaleImage',
        select: 'imageUrl createdAt updatedAt'
      }
    }).select('maleUserId dateFollowed');

    // Get earnings breakdown for each male user
    const maleIds = followingList.map(relationship => relationship.maleUserId._id);
    const earningsData = await getEarningsBreakdownByMaleIds(userId, maleIds);
    var earningsMap = {}; // Using var to hoist to function scope
    earningsData.forEach(earning => {
      earningsMap[earning.maleId] = earning.earnings;
    });
  }

  return followingList.map(relationship => {
    const user = userType === 'male' ? relationship.femaleUserId : relationship.maleUserId;
    
    // Get earnings data for this user
    const earnings = earningsMap[relationship[userType === 'male' ? 'femaleUserId' : 'maleUserId']._id.toString()] || {
      total: 0,
      calls: 0,
      callCoins: 0,
      gifts: 0,
      giftCoins: 0,
      tips: 0,
      tipCoins: 0
    };

    return {
      _id: user._id,
      name: userType === 'male' 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      age: user.age || calculateAgeFromDOB(user.dateOfBirth) || null,
      profileImage: user.images && user.images.length > 0 ? user.images[0].imageUrl : null,
      onlineStatus: user.onlineStatus || false,
      dateFollowed: relationship.dateFollowed,
      earnings: earnings.total
    };
  });
};

/**
 * Get detailed followers list for female users
 */
const getDetailedFollowersList = async (userId, userType) => {
  let followersList = [];
  let blockedByCurrentUserIds = [];
  let blockedByOthersIds = [];

  if (userType === 'male') {
    // Get list of users that the current male user has blocked
    const blockedByCurrentUser = await BlockList.find({ maleUserId: userId }).select('blockedUserId');
    blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current male user
    const blockedByOthers = await FemaleBlockList.find({ blockedUserId: userId }).select('femaleUserId');
    blockedByOthersIds = blockedByOthers.map(block => block.femaleUserId);

    // Get followers list for male user (female users following the male)
    followersList = await MaleFollowers.find({ 
      maleUserId: userId,
      femaleUserId: { 
        $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds]
      }
    }).populate({
      path: 'femaleUserId',
      populate: {
        path: 'images',
        model: 'FemaleImage',
        select: 'imageUrl createdAt updatedAt'
      }
    }).select('femaleUserId dateFollowed');
  } else if (userType === 'female') {
    // Get list of users that the current female user has blocked
    const blockedByCurrentUser = await FemaleBlockList.find({ femaleUserId: userId }).select('blockedUserId');
    blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current female user
    const blockedByOthers = await BlockList.find({ blockedUserId: userId }).select('maleUserId');
    blockedByOthersIds = blockedByOthers.map(block => block.maleUserId);

    // Get followers list for female user (male users following the female)
    followersList = await FemaleFollowers.find({ 
      femaleUserId: userId,
      maleUserId: { 
        $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds]
      }
    }).populate({
      path: 'maleUserId',
      populate: {
        path: 'images',
        model: 'MaleImage',
        select: 'imageUrl createdAt updatedAt'
      }
    }).select('maleUserId dateFollowed');

    // Get earnings breakdown for each male user
    const maleIds = followersList.map(relationship => relationship.maleUserId._id);
    const earningsData = await getEarningsBreakdownByMaleIds(userId, maleIds);
    var earningsMap = {}; // Using var to hoist to function scope for this function
    earningsData.forEach(earning => {
      earningsMap[earning.maleId] = earning.earnings;
    });
  }

  return followersList.map(relationship => {
    const user = userType === 'male' ? relationship.femaleUserId : relationship.maleUserId;
    
    // Get earnings data for this user
    const earnings = earningsMap[relationship[userType === 'male' ? 'femaleUserId' : 'maleUserId']._id.toString()] || {
      total: 0,
      calls: 0,
      callCoins: 0,
      gifts: 0,
      giftCoins: 0,
      tips: 0,
      tipCoins: 0
    };

    return {
      _id: user._id,
      name: userType === 'male' 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      age: user.age || calculateAgeFromDOB(user.dateOfBirth) || null,
      profileImage: user.images && user.images.length > 0 ? user.images[0].imageUrl : null,
      onlineStatus: user.onlineStatus || false,
      dateFollowed: relationship.dateFollowed,
      earnings: earnings.total
    };
  });
};

module.exports = {
  getDetailedFollowingList,
  getDetailedFollowersList
};