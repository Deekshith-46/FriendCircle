// src/controllers/agencyControllers/referralController.js
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const FemaleImage = require('../../models/femaleUser/Image');
const AgencyUser = require('../../models/agency/AgencyUser');

/**
 * Get female users who joined using agency's referral code
 * @route GET /agency/referrals/female-users
 * @access Private (Agency only)
 */
async function getReferredFemaleUsers(req, res) {
  try {
    console.log('=== REFERRAL CONTROLLER CALLED ===');
    console.log('Full req object keys:', Object.keys(req));
    console.log('User:', req.user);
    console.log('User type:', req.userType);
    console.log('Agency ID (id):', req.user?.id);
    console.log('Agency ID (_id):', req.user?._id);
    console.log('Headers:', req.headers.authorization);
    const agencyId = req.user.id || req.user._id;
    console.log('Using agencyId:', agencyId);
    
    // Get the agency to verify and get referral code
    const agency = await AgencyUser.findById(agencyId).select('referralCode');
    
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found'
      });
    }
    
    // Find female users who were referred by this agency
    const referredFemaleUsers = await FemaleUser.find({
      referredByAgency: agencyId
    }).select('name email images reviewStatus isActive createdAt').populate('images');
    
    // Format the response with proper profile image handling
    const formattedUsers = referredFemaleUsers.map(user => {
      // Get the first image if available
      let profileImageUrl = null;
      if (user.images && user.images.length > 0) {
        profileImageUrl = user.images[0].imageUrl || null;
      }
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: profileImageUrl,
        reviewStatus: user.reviewStatus,
        isActive: user.isActive,
        joinedAt: user.createdAt
      };
    });
    
    res.json({
      success: true,
      data: {
        referralCode: agency.referralCode,
        totalReferred: formattedUsers.length,
        femaleUsers: formattedUsers
      }
    });
    
  } catch (error) {
    console.error('Error fetching referred female users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching referred users',
      error: error.message
    });
  }
};

/**
 * Get referral statistics for agency
 * @route GET /agency/referrals/stats
 * @access Private (Agency only)
 */
async function getReferralStats(req, res) {
  try {
    const agencyId = req.user.id;
    
    // Count female users referred by this agency
    const femaleCount = await FemaleUser.countDocuments({
      referredByAgency: agencyId
    });
    
    // Count other agencies referred by this agency (if applicable)
    const agencyCount = await AgencyUser.countDocuments({
      referredByAgency: agencyId
    });
    
    res.json({
      success: true,
      data: {
        femaleUsers: femaleCount,
        agencies: agencyCount,
        total: femaleCount + agencyCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching referral statistics',
      error: error.message
    });
  }
};

module.exports = {
  getReferredFemaleUsers,
  getReferralStats
};
