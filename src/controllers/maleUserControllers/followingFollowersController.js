const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleFollowers = require('../../models/maleUser/Followers');
const MaleFollowing = require('../../models/maleUser/Following');
const FemaleFollowers = require('../../models/femaleUser/Followers');
const FemaleFollowing = require('../../models/femaleUser/Following');
const BlockList = require('../../models/maleUser/BlockList');
const FemaleBlockList = require('../../models/femaleUser/BlockList');
const FollowRequest = require('../../models/common/FollowRequest');
const { getDetailedFollowingList, getDetailedFollowersList } = require('../../utils/followingFollowersHelper');

// Send a follow request to a Female User
exports.sendFollowRequest = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    const maleUser = await MaleUser.findById(req.user._id);

    // Check if a follow request already exists
    const existingRequest = await FollowRequest.findOne({ 
      maleUserId: req.user._id, 
      femaleUserId 
    });
    
    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(400).json({ success: false, message: 'Follow request already sent and pending.' });
    }
    
    // Check if there's actually a following relationship in the database
    if (existingRequest && existingRequest.status === 'accepted') {
      // Verify if the actual following relationship still exists
      const actualFollowing = await MaleFollowing.findOne({ 
        maleUserId: req.user._id, 
        femaleUserId 
      });
      
      if (actualFollowing) {
        return res.status(400).json({ success: false, message: 'Already following this user.' });
      } else {
        // Clean up the orphaned follow request
        await FollowRequest.deleteOne({ 
          maleUserId: req.user._id, 
          femaleUserId,
          status: 'accepted'
        });
      }
    }

    // Check if the female user is blocked by the male user
    const isBlocked = await BlockList.findOne({ 
      maleUserId: req.user._id, 
      blockedUserId: femaleUserId 
    });
    
    if (isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot follow this user. You have blocked them. Please unblock first to follow.' 
      });
    }

    // Create a new follow request
    const followRequest = new FollowRequest({
      maleUserId: req.user._id,
      femaleUserId,
    });
    
    await followRequest.save();

    res.json({ success: true, message: 'Follow request sent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Cancel a pending follow request
exports.cancelFollowRequest = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    // Find and delete the pending follow request
    const followRequest = await FollowRequest.findOneAndDelete({ 
      maleUserId: req.user._id, 
      femaleUserId,
      status: 'pending'
    });

    if (!followRequest) {
      return res.status(404).json({ success: false, message: 'No pending follow request found.' });
    }

    res.json({ success: true, message: 'Follow request cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Male User's Sent Follow Requests
exports.getSentFollowRequests = async (req, res) => {
  try {
    const followRequests = await FollowRequest.find({ maleUserId: req.user._id })
      .populate('femaleUserId', 'firstName lastName email profileImages')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: followRequests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Follow a Female User (this will be used internally when a follow request is accepted)
exports.followUser = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    const maleUser = await MaleUser.findById(req.user._id);

    // Check if the male user is already following the female user
    const existingFollowing = await MaleFollowing.findOne({ maleUserId: req.user._id, femaleUserId });
    if (existingFollowing) {
      return res.status(400).json({ success: false, message: 'Already following this user.' });
    }

    // Check if the female user is blocked by the male user
    const isBlocked = await BlockList.findOne({ 
      maleUserId: req.user._id, 
      blockedUserId: femaleUserId 
    });
    
    if (isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot follow this user. You have blocked them. Please unblock first to follow.' 
      });
    }

    // Create a new MaleFollowing entry
    const newFollowing = new MaleFollowing({
      maleUserId: req.user._id,
      femaleUserId,
    });
    await newFollowing.save();

    // Now, create the corresponding FemaleFollower entry
    const newFollower = new FemaleFollowers({
      femaleUserId,
      maleUserId: req.user._id,
    });
    await newFollower.save();

    // Update user documents to include references to these relationships
    // Add the new following reference to the male user's document
    await MaleUser.findByIdAndUpdate(req.user._id, {
      $addToSet: { malefollowing: newFollowing._id }
    });

    // Add the new follower reference to the female user's document
    await FemaleUser.findByIdAndUpdate(femaleUserId, {
      $addToSet: { followers: newFollower._id }
    });

    res.json({ success: true, message: 'Following female user successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Unfollow a Female User
exports.unfollowUser = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    // Check if we have the required user information
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Find and remove ALL possible relationship combinations
    const results = {
      maleFollowing: null,
      femaleFollowers: null,
      femaleFollowing: null,
      maleFollowers: null
    };

    // 1. Male following Female (MaleFollowing + FemaleFollowers)
    results.maleFollowing = await MaleFollowing.findOneAndDelete({ 
      maleUserId: req.user._id, 
      femaleUserId 
    });
    
    if (results.maleFollowing) {
      // Remove reference from Male user document
      await MaleUser.findByIdAndUpdate(req.user._id, {
        $pull: { malefollowing: results.maleFollowing._id }
      });
      
      // Also remove the corresponding FemaleFollowers record
      results.femaleFollowers = await FemaleFollowers.findOneAndDelete({ 
        maleUserId: req.user._id, 
        femaleUserId 
      });
      
      if (results.femaleFollowers) {
        // Remove reference from Female user document
        await FemaleUser.findByIdAndUpdate(femaleUserId, {
          $pull: { followers: results.femaleFollowers._id }
        });
      }
    }

    // 2. Female following Male (FemaleFollowing + MaleFollowers)
    results.femaleFollowing = await FemaleFollowing.findOneAndDelete({ 
      femaleUserId, 
      maleUserId: req.user._id
    });
    
    if (results.femaleFollowing) {
      // Remove reference from Female user document
      await FemaleUser.findByIdAndUpdate(femaleUserId, {
        $pull: { femalefollowing: results.femaleFollowing._id }
      });
      
      // Also remove the corresponding MaleFollowers record
      results.maleFollowers = await MaleFollowers.findOneAndDelete({ 
        maleUserId: req.user._id, 
        femaleUserId 
      });
      
      if (results.maleFollowers) {
        // Remove reference from Male user document
        await MaleUser.findByIdAndUpdate(req.user._id, {
          $pull: { malefollowers: results.maleFollowers._id }
        });
      }
    }

    // Also clean up any related follow request records
    await FollowRequest.deleteMany({ 
      $or: [
        { maleUserId: req.user._id, femaleUserId },
        { maleUserId: femaleUserId, femaleUserId: req.user._id }
      ]
    });

    res.json({ success: true, message: 'Unfollowed female user successfully.' });
  } catch (err) {
    console.error('Error in unfollowUser:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Male User's Following List
exports.getMaleFollowingList = async (req, res) => {
  try {
    const detailedFollowingList = await getDetailedFollowingList(req.user._id, 'male');
    
    res.json({ success: true, data: detailedFollowingList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Male User's Followers List
exports.getMaleFollowersList = async (req, res) => {
  try {
    const detailedFollowersList = await getDetailedFollowersList(req.user._id, 'male');
    
    res.json({ success: true, data: detailedFollowersList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
