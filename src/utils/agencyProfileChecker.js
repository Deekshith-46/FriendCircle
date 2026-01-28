const AgencyUser = require('../models/agency/AgencyUser');

/**
 * Helper function to check if agency profile is complete and update status
 * @param {string} agencyId - The agency user ID
 * @returns {Promise<boolean>} - Returns true if profile was marked as completed
 */
const checkAndMarkAgencyProfileCompleted = async (agencyId) => {
  try {
    const agency = await AgencyUser.findById(agencyId);
    if (!agency) return false;

    // Check if agency has both details and image
    const hasDetails = agency.firstName && agency.lastName && agency.aadharOrPanNum;
    const hasImage = agency.image;

    if (hasDetails && hasImage && !agency.profileCompleted) {
      // Mark as profile completed and set review status to pending
      agency.profileCompleted = true;
      agency.reviewStatus = 'pending';
      await agency.save();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in checkAndMarkAgencyProfileCompleted:', error);
    return false;
  }
};

module.exports = {
  checkAndMarkAgencyProfileCompleted
};