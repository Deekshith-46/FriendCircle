// /controllers/femaleUserControllers/blockListController.js
const BlockList = require('../../models/femaleUser/BlockList');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const FemaleFollowing = require('../../models/femaleUser/Following');
const FemaleFollowers = require('../../models/femaleUser/Followers');
const MaleFollowing = require('../../models/maleUser/Following');
const MaleFollowers = require('../../models/maleUser/Followers');
const FollowRequest = require('../../models/common/FollowRequest');

// Block a male user
exports.blockUser = async (req, res) => {
  const { maleUserId } = req.body;
  
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
      femaleUserId: req.user.id, 
      blockedUserId: maleUserId 
    });
    
    if (existingBlock) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already blocked.' 
      });
    }

    // 1. Remove all follow relationships
    // Remove female following male
    await FemaleFollowing.findOneAndDelete({ 
      femaleUserId: req.user.id, 
      maleUserId 
    });
    
    // Remove male follower of female
    await MaleFollowers.findOneAndDelete({ 
      maleUserId, 
      femaleUserId: req.user.id 
    });
    
    // Remove male following female (if he followed back)
    await MaleFollowing.findOneAndDelete({ 
      maleUserId, 
      femaleUserId: req.user.id 
    });
    
    // Remove female follower of male (if he followed back)
    await FemaleFollowers.findOneAndDelete({ 
      femaleUserId: req.user.id, 
      maleUserId 
    });
    
    // 2. Remove any pending follow requests
    await FollowRequest.findOneAndDelete({ 
      maleUserId, 
      femaleUserId: req.user.id 
    });
    
    // 3. Add to block list
    const block = new BlockList({ 
      femaleUserId: req.user.id, 
      blockedUserId: maleUserId 
    });
    
    await block.save();
    
    res.json({ 
      success: true, 
      message: 'User blocked successfully. All connections removed.' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Unblock a male user
exports.unblockUser = async (req, res) => {
  const { maleUserId } = req.body;
  
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
      femaleUserId: req.user.id, 
      blockedUserId: maleUserId 
    });
    
    if (!existingBlock) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not blocked.' 
      });
    }

    // Remove from block list
    await BlockList.findOneAndDelete({ 
      femaleUserId: req.user.id, 
      blockedUserId: maleUserId 
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

    const blockList = await BlockList.find({ femaleUserId: req.user.id })
      .populate({
        path: 'blockedUserId',
        select: 'firstName lastName email profileImages'
      });
    res.json({ success: true, data: blockList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};