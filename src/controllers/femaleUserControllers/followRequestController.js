const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const FollowRequest = require('../../models/common/FollowRequest');
const MaleFollowing = require('../../models/maleUser/Following');
const MaleFollowers = require('../../models/maleUser/Followers');
const FemaleFollowers = require('../../models/femaleUser/Followers');
const BlockList = require('../../models/femaleUser/BlockList');

// Get received follow requests for a female user
exports.getReceivedFollowRequests = async (req, res) => {
  try {
    const followRequests = await FollowRequest.find({ 
      femaleUserId: req.user._id,
      status: 'pending'
    })
    .populate('maleUserId', 'firstName lastName email profileImages')
    .sort({ createdAt: -1 });
    
    res.json({ success: true, data: followRequests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Accept a follow request from a male user
exports.acceptFollowRequest = async (req, res) => {
  const { maleUserId } = req.body;

  try {
    // Find the pending follow request
    const followRequest = await FollowRequest.findOne({ 
      maleUserId, 
      femaleUserId: req.user._id,
      status: 'pending'
    });

    if (!followRequest) {
      return res.status(404).json({ success: false, message: 'No pending follow request found from this user.' });
    }

    // Check if the male user is blocked by the female user
    const isBlocked = await BlockList.findOne({ 
      femaleUserId: req.user._id, 
      blockedUserId: maleUserId 
    });
    
    if (isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot accept follow request from this user. You have blocked them.' 
      });
    }

    // Update the follow request status to accepted
    followRequest.status = 'accepted';
    followRequest.updatedAt = Date.now();
    await followRequest.save();

    // Add to Female's followers list (the male user is following the female user)
    // Note: No automatic follow-back happens. Female remains not following the male unless she explicitly taps Follow back.
    const newFollower = new FemaleFollowers({
      femaleUserId: req.user._id,
      maleUserId,
    });
    await newFollower.save();

    // Add the new follower reference to the female user's document
    await FemaleUser.findByIdAndUpdate(req.user._id, {
      $addToSet: { followers: newFollower._id }
    });

    // Add to Male's following list (the female user is now in the male user's following list)
    const newFollowing = new MaleFollowing({
      maleUserId,
      femaleUserId: req.user._id,
    });
    await newFollowing.save();

    // Add the new following reference to the male user's document
    await MaleUser.findByIdAndUpdate(maleUserId, {
      $addToSet: { malefollowing: newFollowing._id }
    });

    res.json({ success: true, message: 'Follow request accepted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Reject a follow request from a male user
exports.rejectFollowRequest = async (req, res) => {
  const { maleUserId } = req.body;

  try {
    // Find and delete the pending follow request
    const followRequest = await FollowRequest.findOneAndDelete({ 
      maleUserId, 
      femaleUserId: req.user._id,
      status: 'pending'
    });

    if (!followRequest) {
      return res.status(404).json({ success: false, message: 'No pending follow request found from this user.' });
    }

    res.json({ success: true, message: 'Follow request rejected successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all follow requests (pending, accepted, rejected) for a female user
exports.getAllFollowRequests = async (req, res) => {
  try {
    const { status } = req.query; // optional filter by status
    
    const filter = { femaleUserId: req.user._id };
    if (status) {
      filter.status = status;
    }
    
    const followRequests = await FollowRequest.find(filter)
      .populate('maleUserId', 'firstName lastName email profileImages')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: followRequests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};