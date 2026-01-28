const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleFollowers = require('../../models/femaleUser/Followers');
const FemaleFollowing = require('../../models/femaleUser/Following');
const MaleFollowers = require('../../models/maleUser/Followers');
const MaleFollowing = require('../../models/maleUser/Following');
const BlockList = require('../../models/femaleUser/BlockList');
const MaleBlockList = require('../../models/maleUser/BlockList');
const FollowRequest = require('../../models/common/FollowRequest');
const messages = require('../../validations/messages');
const { getDetailedFollowingList, getDetailedFollowersList } = require('../../utils/followingFollowersHelper');

// Follow a Male User (Explicit follow-back functionality)
exports.followBackUser = async (req, res) => {
  const { maleUserId } = req.body;

  try {
    const femaleUser = await FemaleUser.findById(req.user._id);

    // Check if there's already a following relationship
    const existingFollowing = await FemaleFollowing.findOne({ femaleUserId: req.user._id, maleUserId });
    if (existingFollowing) {
      return res.status(400).json({ success: false, message: messages.FOLLOW.ALREADY_FOLLOWING });
    }

    // Check if the male user is actually following the female user (exists in female's followers list)
    const isFollower = await FemaleFollowers.findOne({ femaleUserId: req.user._id, maleUserId });
    if (!isFollower) {
      return res.status(400).json({ success: false, message: messages.FOLLOW.NOT_FOLLOWER });
    }

    // Check if the male user is blocked by the female user
    const isBlocked = await BlockList.findOne({ 
      femaleUserId: req.user._id, 
      blockedUserId: maleUserId 
    });
    
    if (isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: messages.FOLLOW.BLOCKED_CANNOT_FOLLOW 
      });
    }

    // Create a new FemaleFollowing entry
    const newFemaleFollowing = new FemaleFollowing({
      femaleUserId: req.user._id,
      maleUserId,
    });

    // Add to Female's following list
    await newFemaleFollowing.save();

    // Create a new MaleFollower entry
    const newFollower = new MaleFollowers({
      maleUserId,
      femaleUserId: req.user._id,
    });

    // Add to Male's followers list
    await newFollower.save();

    // Update user documents to include references to these relationships
    // Add the new following reference to the female user's document
    await FemaleUser.findByIdAndUpdate(req.user._id, {
      $addToSet: { femalefollowing: newFemaleFollowing._id }
    });

    // Add the new follower reference to the male user's document
    await MaleUser.findByIdAndUpdate(maleUserId, {
      $addToSet: { malefollowers: newFollower._id }
    });

    res.json({ success: true, message: messages.FOLLOW.FOLLOW_SUCCESS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Follow a Male User
exports.followUser = async (req, res) => {
  const { maleUserId } = req.body;

  try {
    const femaleUser = await FemaleUser.findById(req.user._id);

    // Check if there's already a following relationship
    const existingFollowing = await FemaleFollowing.findOne({ femaleUserId: req.user._id, maleUserId });
    if (existingFollowing) {
      return res.status(400).json({ success: false, message: messages.FOLLOW.ALREADY_FOLLOWING });
    }

    // Check if the male user is blocked by the female user
    const isBlocked = await BlockList.findOne({ 
      femaleUserId: req.user._id, 
      blockedUserId: maleUserId 
    });
    
    if (isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: messages.FOLLOW.BLOCKED_CANNOT_FOLLOW 
      });
    }

    // Create a new FemaleFollowing entry
    const newFemaleFollowing = new FemaleFollowing({
      femaleUserId: req.user._id,
      maleUserId,
    });

    // Add to Female's following list
    await newFemaleFollowing.save();

    // Create a new MaleFollower entry
    const newFollower = new MaleFollowers({
      maleUserId,
      femaleUserId: req.user._id,
    });

    // Add to Male's followers list
    await newFollower.save();

    // Update user documents to include references to these relationships
    // Add the new following reference to the female user's document
    await FemaleUser.findByIdAndUpdate(req.user._id, {
      $addToSet: { femalefollowing: newFemaleFollowing._id }
    });

    // Add the new follower reference to the male user's document
    await MaleUser.findByIdAndUpdate(maleUserId, {
      $addToSet: { malefollowers: newFollower._id }
    });

    res.json({ success: true, message: messages.FOLLOW.FOLLOW_SUCCESS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Unfollow a Male User
exports.unfollowUser = async (req, res) => {
  const { maleUserId } = req.body;
  
  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: messages.FOLLOW.AUTHENTICATION_REQUIRED 
      });
    }

    // Find and remove ALL possible relationship combinations
    const results = {
      femaleFollowing: null,
      maleFollowers: null,
      maleFollowing: null,
      femaleFollowers: null
    };

    // 1. Female following Male (FemaleFollowing + MaleFollowers)
    results.femaleFollowing = await FemaleFollowing.findOneAndDelete({ 
      femaleUserId: req.user._id, 
      maleUserId 
    });
    
    if (results.femaleFollowing) {
      // Remove reference from Female user document
      await FemaleUser.findByIdAndUpdate(req.user._id, {
        $pull: { femalefollowing: results.femaleFollowing._id }
      });
      
      // Also remove the corresponding MaleFollowers record
      results.maleFollowers = await MaleFollowers.findOneAndDelete({ 
        maleUserId, 
        femaleUserId: req.user._id
      });
      
      if (results.maleFollowers) {
        // Remove reference from Male user document
        await MaleUser.findByIdAndUpdate(maleUserId, {
          $pull: { malefollowers: results.maleFollowers._id }
        });
      }
    }

    // 2. Male following Female (MaleFollowing + FemaleFollowers)
    results.maleFollowing = await MaleFollowing.findOneAndDelete({ 
      maleUserId, 
      femaleUserId: req.user._id
    });
    
    if (results.maleFollowing) {
      // Remove reference from Male user document
      await MaleUser.findByIdAndUpdate(maleUserId, {
        $pull: { malefollowing: results.maleFollowing._id }
      });
      
      // Also remove the corresponding FemaleFollowers record
      results.femaleFollowers = await FemaleFollowers.findOneAndDelete({ 
        maleUserId, 
        femaleUserId: req.user._id
      });
      
      if (results.femaleFollowers) {
        // Remove reference from Female user document
        await FemaleUser.findByIdAndUpdate(req.user._id, {
          $pull: { followers: results.femaleFollowers._id }
        });
      }
    }

    // Also clean up any related follow request records
    await FollowRequest.deleteMany({ 
      $or: [
        { maleUserId, femaleUserId: req.user._id },
        { maleUserId: req.user._id, femaleUserId: maleUserId }
      ]
    });

    res.json({ success: true, message: messages.FOLLOW.UNFOLLOW_SUCCESS });
  } catch (err) {
    console.error('Error in unfollowUser:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Female User's Following List
exports.getFemaleFollowingList = async (req, res) => {
  try {
    const detailedFollowingList = await getDetailedFollowingList(req.user._id, 'female');
    
    res.json({ success: true, data: detailedFollowingList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Female User's Followers List
exports.getFemaleFollowersList = async (req, res) => {
  try {
    const detailedFollowersList = await getDetailedFollowersList(req.user._id, 'female');
    
    res.json({ success: true, data: detailedFollowersList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
