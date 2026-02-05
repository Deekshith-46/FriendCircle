const AdminConfig = require('../models/admin/AdminConfig');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const AgencyUser = require('../models/agency/AgencyUser');
const MaleUser = require('../models/maleUser/MaleUser');
const Transaction = require('../models/common/Transaction');

/**
 * Process referral bonus for a user based on their type
 * @param {Object} user - The user who was referred
 * @param {string} userType - The type of user ('female', 'agency', or 'male')
 * @returns {boolean} - True if referral bonus was processed, false otherwise
 */
const processReferralBonus = async (user, userType) => {
  try {
    // Get admin config for referral bonus amounts
    const config = await AdminConfig.getConfig();
    
    // Check if user has been referred
    let hasReferral = false;
    
    if (userType === 'female') {
      hasReferral = (user.referredByFemale && user.referredByFemale.length > 0) || 
                   (user.referredByAgency && user.referredByAgency !== null);
    } else if (userType === agency) {
      hasReferral = user.referredByAgency && user.referredByAgency !== null;
    } else if (userType === 'male') {
      hasReferral = user.referredBy && user.referredBy.length > 0;
    }
    
    if (!hasReferral) {
      return false;
    }
    
    let referrer = null;
    let referralBonusAmount = 0;
    let referrerBonusAmount = 0;
    let referredUserBonusAmount = 0;
    let bonusType = null; // 'wallet' or 'coin'
    
    // Determine referrer and bonus amount based on user type and referral source
    if (userType === 'female') {
      // Female user - can be referred by Female or Agency
      if (user.referredByFemale && user.referredByFemale.length > 0) { // Referred by Female
        referrer = await FemaleUser.findById(user.referredByFemale[0]);
        if (referrer) {
          // Both referrer and referred get femaleReferralBonus
          const femaleBonus = config.femaleReferralBonus;
          if (femaleBonus === undefined || femaleBonus <= 0) return false;
          referralBonusAmount = femaleBonus;
          referrerBonusAmount = femaleBonus;
          referredUserBonusAmount = femaleBonus;
          bonusType = 'wallet';
        }
      } else if (user.referredByAgency) { // Referred by Agency
        referrer = await AgencyUser.findById(user.referredByAgency);
        if (referrer) {
          // Agency gets agencyReferralBonus, Female gets femaleReferralBonus
          const agencyBonus = config.agencyReferralBonus;
          const femaleBonus = config.femaleReferralBonus;
          if (agencyBonus === undefined || agencyBonus <= 0 || femaleBonus === undefined || femaleBonus <= 0) return false;
          referrerBonusAmount = agencyBonus;
          referredUserBonusAmount = femaleBonus;
          bonusType = 'wallet';
        }
      }
    } else if (userType === 'agency') {
      // Agency user - can only be referred by Agency
      if (user.referredByAgency) {
        referrer = await AgencyUser.findById(user.referredByAgency);
        if (referrer) {
          // Both referrer and referred get agencyReferralBonus
          const agencyBonus = config.agencyReferralBonus;
          if (agencyBonus === undefined || agencyBonus <= 0) return false;
          referrerBonusAmount = agencyBonus;
          referredUserBonusAmount = agencyBonus;
          bonusType = 'wallet';
        }
      }
    } else if (userType === 'male') {
      // Male user - can only be referred by Male
      if (user.referredBy && user.referredBy.length > 0) {
        referrer = await MaleUser.findById(user.referredBy[0]);
        if (referrer) {
          // Both referrer and referred get maleReferralBonus in coins
          const maleBonus = config.maleReferralBonus;
          if (maleBonus === undefined || maleBonus <= 0) return false;
          referrerBonusAmount = maleBonus;
          referredUserBonusAmount = maleBonus;
          bonusType = 'coin';
        }
      }
    }
    
    // Validate referrer and prevent self-referral
    if (!referrer || referrer._id.toString() === user._id.toString()) {
      return false;
    }
    
    // Validate bonus amounts to ensure they are properly set
    if (referrerBonusAmount <= 0 || referredUserBonusAmount <= 0) {
      return false;
    }
    
    // Update referrer's balance based on bonus type
    if (bonusType === 'wallet') {
      referrer.walletBalance = (referrer.walletBalance || 0) + referrerBonusAmount;
    } else if (bonusType === 'coin') {
      referrer.coinBalance = (referrer.coinBalance || 0) + referrerBonusAmount;
    }
    await referrer.save();
    
    // Update referred user's balance based on bonus type
    if (bonusType === 'wallet') {
      user.walletBalance = (user.walletBalance || 0) + referredUserBonusAmount;
    } else if (bonusType === 'coin') {
      user.coinBalance = (user.coinBalance || 0) + referredUserBonusAmount;
    }
    
    await user.save();
    
    // Create transaction records for both referrer and referred user
    await Transaction.create({
      userType: getTransactionUserType(referrer.constructor.modelName),
      userId: referrer._id,
      operationType: bonusType,
      action: 'credit',
      amount: referrerBonusAmount,
      message: `Referral bonus for inviting ${getUserEmail(user, userType)}`,
      balanceAfter: bonusType === 'wallet' ? referrer.walletBalance : referrer.coinBalance,
      createdBy: referrer._id
    });
    
    await Transaction.create({
      userType: getTransactionUserType(user.constructor.modelName),
      userId: user._id,
      operationType: bonusType,
      action: 'credit',
      amount: referredUserBonusAmount,
      message: `Referral signup bonus using ${getReferrerCode(referrer, userType)}`,
      balanceAfter: bonusType === 'wallet' ? user.walletBalance : user.coinBalance,
      createdBy: user._id
    });
    
    return true;
  } catch (error) {
    console.error('Error processing referral bonus:', error);
    return false;
  }
};

// Helper function to get transaction user type
function getTransactionUserType(modelName) {
  if (modelName.includes('Female')) return 'female';
  if (modelName.includes('Agency')) return 'agency';
  if (modelName.includes('Male')) return 'male';
  return 'unknown';
}

// Helper function to get user email
function getUserEmail(user, userType) {
  if (userType === 'female') return user.email || user._id;
  if (userType === 'agency') return user.email || user._id;
  if (userType === 'male') return user.email || user._id;
  return user._id;
}

// Helper function to get referrer code
function getReferrerCode(referrer, userType) {
  if (userType === 'female' && referrer.referralCode) return referrer.referralCode;
  if (userType === 'agency' && referrer.referralCode) return referrer.referralCode;
  if (userType === 'male' && referrer.referralCode) return referrer.referralCode;
  return referrer._id;
}

module.exports = processReferralBonus;
