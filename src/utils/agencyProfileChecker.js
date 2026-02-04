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

    // If already completed, do nothing
    if (agency.profileCompleted) {
      return true;
    }

    // Check required fields
    const hasDetails =
      agency.firstName &&
      agency.lastName &&
      agency.aadharOrPanNum;

    const hasImage = !!agency.image;

    // Mark completed only once
    if (hasDetails && hasImage) {
      agency.profileCompleted = true;
      agency.reviewStatus = 'pending'; // 🔥 matches female flow
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
