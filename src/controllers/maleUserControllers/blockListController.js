const BlockList = require('../../models/maleUser/BlockList');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleFollowing = require('../../models/maleUser/Following');
const MaleFollowers = require('../../models/maleUser/Followers');
const FemaleFollowing = require('../../models/femaleUser/Following');
const FemaleFollowers = require('../../models/femaleUser/Followers');
const FollowRequest = require('../../models/common/FollowRequest');

// Block a female user
exports.blockUser = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    // Check if we have the required user information
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Check if already blocked
    const existingBlock = await BlockList.findOne({ 
      maleUserId: req.user.id, 
      blockedUserId: femaleUserId 
    });
    
    if (existingBlock) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already blocked.' 
      });
    }

    // 1. Remove all follow relationships
    // Remove male following female
    await MaleFollowing.findOneAndDelete({ 
      maleUserId: req.user.id, 
      femaleUserId 
    });
    
    // Remove female follower of male
    await FemaleFollowers.findOneAndDelete({ 
      femaleUserId, 
      maleUserId: req.user.id 
    });
    
    // Remove female following male (if she followed back)
    await FemaleFollowing.findOneAndDelete({ 
      femaleUserId, 
      maleUserId: req.user.id 
    });
    
    // Remove male follower of female (if she followed back)
    await MaleFollowers.findOneAndDelete({ 
      maleUserId: req.user.id, 
      femaleUserId 
    });
    
    // 2. Remove any pending follow requests
    await FollowRequest.findOneAndDelete({ 
      maleUserId: req.user.id, 
      femaleUserId 
    });
    
    // 3. Add to block list
    const newBlock = new BlockList({
      maleUserId: req.user.id,
      blockedUserId: femaleUserId
    });

    await newBlock.save();

    res.json({ 
      success: true, 
      message: 'User blocked successfully. All connections removed.' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Unblock a female user
exports.unblockUser = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    // Check if we have the required user information
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    // Check if user is actually blocked
    const existingBlock = await BlockList.findOne({ 
      maleUserId: req.user.id, 
      blockedUserId: femaleUserId 
    });
    
    if (!existingBlock) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not blocked.' 
      });
    }

    // Remove from block list
    await BlockList.findOneAndDelete({
      maleUserId: req.user.id,
      blockedUserId: femaleUserId
    });

    res.json({ 
      success: true, 
      message: 'User unblocked successfully. You can now interact with them again.' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get block list
exports.getBlockList = async (req, res) => {
  try {
    // Check if we have the required user information
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    const blockList = await BlockList.find({ maleUserId: req.user.id })
      .populate({
        path: 'blockedUserId',
        select: 'firstName lastName email profileImages'
      });
    res.json({ success: true, data: blockList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};