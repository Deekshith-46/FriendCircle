const AgencyBlockList = require('../../models/agency/BlockList');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const messages = require('../../validations/messages');

// Block a female user
exports.blockUser = async (req, res) => {
  try {
    const { femaleUserId } = req.body;

    if (!femaleUserId) {
      return res.status(400).json({
        success: false,
        message: 'Female user ID is required'
      });
    }

    // Check if the female user exists
    const femaleUser = await FemaleUser.findById(femaleUserId);
    if (!femaleUser) {
      return res.status(404).json({
        success: false,
        message: 'Female user not found'
      });
    }

    // Check if the female user is referred by this agency
    const isReferredByAgency = femaleUser.referredByAgency && 
      femaleUser.referredByAgency.toString() === req.user._id.toString();
    
    if (!isReferredByAgency) {
      return res.status(403).json({
        success: false,
        message: 'You can only block users you have referred'
      });
    }

    // Check if already blocked
    const existingBlock = await AgencyBlockList.findOne({
      agencyUserId: req.user._id,
      blockedUserId: femaleUserId
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // Create block entry
    const blockEntry = new AgencyBlockList({
      agencyUserId: req.user._id,
      blockedUserId: femaleUserId
    });

    await blockEntry.save();

    res.json({
      success: true,
      message: 'User blocked successfully',
      data: blockEntry
    });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Unblock a female user
exports.unblockUser = async (req, res) => {
  try {
    const { femaleUserId } = req.body;

    if (!femaleUserId) {
      return res.status(400).json({
        success: false,
        message: 'Female user ID is required'
      });
    }

    // Check if the block entry exists
    const blockEntry = await AgencyBlockList.findOneAndDelete({
      agencyUserId: req.user._id,
      blockedUserId: femaleUserId
    });

    if (!blockEntry) {
      return res.status(404).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get block list
exports.getBlockList = async (req, res) => {
  try {
    const blockedUsers = await AgencyBlockList.find({
      agencyUserId: req.user._id
    }).populate('blockedUserId', 'name images');

    // Get the first image for each blocked user
    const blockedUsersWithImages = await Promise.all(blockedUsers.map(async (block) => {
      let profileImage = null;
      if (block.blockedUserId.images && block.blockedUserId.images.length > 0) {
        const FemaleImage = require('../../models/femaleUser/Image');
        const imageDoc = await FemaleImage.findById(block.blockedUserId.images[0]);
        if (imageDoc) {
          profileImage = imageDoc.imageUrl;
        }
      }
      
      return {
        _id: block.blockedUserId._id,
        name: block.blockedUserId.name,
        profileImage: profileImage,
        blockedAt: block.blockedAt
      };
    }));

    res.json({
      success: true,
      data: blockedUsersWithImages
    });
  } catch (err) {
    console.error('Error getting block list:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};