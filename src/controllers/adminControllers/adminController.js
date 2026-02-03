const AdminUser = require('../../models/admin/AdminUser');
const Staff = require('../../models/admin/Staff');
const AdminConfig = require('../../models/admin/AdminConfig');
const bcrypt = require('bcryptjs');
const generateToken = require('../../utils/generateToken');
const createAuditLog = require('../../utils/createAuditLog');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');

// Login Admin or Staff (unified login with user type selection)
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }
    console.log("git not working")

    
    if (userType === 'admin') {
      const admin = await AdminUser.findOne({ email });
      if (!admin) return res.status(400).json({ success: false, message: messages.ADMIN.INVALID_CREDENTIALS });

      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) return res.status(400).json({ success: false, message: messages.ADMIN.INVALID_CREDENTIALS });

      res.json({
        success: true,
        data: {
          token: generateToken(admin._id, 'admin'),
          user: { id: admin._id, name: admin.name, email: admin.email, type: 'admin' }
        }
      });
    } else if (userType === 'staff') {
      const staff = await Staff.findOne({ email, status: 'publish' });
      if (!staff) return res.status(400).json({ success: false, message: messages.ADMIN.INVALID_CREDENTIALS_STAFF });

      const isMatch = await bcrypt.compare(password, staff.passwordHash);
      if (!isMatch) return res.status(400).json({ success: false, message: messages.ADMIN.INVALID_CREDENTIALS });

      res.json({
        success: true,
        data: {
          token: generateToken(staff._id, 'staff'),
          user: { id: staff._id, email: staff.email, type: 'staff', permissions: staff.permissions }
        }
      });
    } else {
      return res.status(400).json({ success: false, message: messages.ADMIN.INVALID_USER_TYPE });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Current Admin Profile
exports.getProfile = async (req, res) => {
  try {
    res.json({ success: true, data: req.admin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Admin (name, password)
exports.updateAdmin = async (req, res) => {
  try {
    const { name, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const admin = await AdminUser.findByIdAndUpdate(req.admin._id, updateData, { new: true });
    await createAuditLog(req.admin._id, 'UPDATE', 'AdminUser', admin._id, updateData);

    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Admin Account
exports.deleteAdmin = async (req, res) => {
  try {
    await AdminUser.findByIdAndDelete(req.admin._id);
    await createAuditLog(req.admin._id, 'DELETE', 'AdminUser', req.admin._id, {});

    res.json({ success: true, message: messages.USER.USER_DELETED });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get admin configuration
exports.getAdminConfig = async (req, res) => {
  try {
    const config = await AdminConfig.getConfig();
    return res.json({
      success: true,
      data: config
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Update minCallCoins setting
exports.updateMinCallCoins = async (req, res) => {
  try {
    const { minCallCoins } = req.body;
    
    // Validate input
    if (minCallCoins === undefined || minCallCoins === null) {
      return res.status(400).json({ 
        success: false, 
        message: messages.ADMIN.MIN_CALL_COINS_REQUIRED 
      });
    }
    
    const numericValue = Number(minCallCoins);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return res.status(400).json({ 
        success: false, 
        message: messages.ADMIN.MIN_CALL_COINS_INVALID 
      });
    }
    
    // Get or create config and update minCallCoins
    let config = await AdminConfig.getConfig();
    config.minCallCoins = numericValue;
    await config.save();
    
    return res.json({
      success: true,
      message: messages.ADMIN.MIN_CALL_COINS_UPDATED,
      data: {
        minCallCoins: config.minCallCoins
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Update coin to rupee conversion rate
exports.updateCoinToRupeeRate = async (req, res) => {
  try {
    const { coinToRupeeConversionRate } = req.body;
    
    // Validate input
    if (coinToRupeeConversionRate === undefined || coinToRupeeConversionRate === null) {
      return res.status(400).json({ 
        success: false, 
        message: messages.ADMIN.CONVERSION_RATE_REQUIRED 
      });
    }
    
    const numericValue = Number(coinToRupeeConversionRate);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: messages.ADMIN.CONVERSION_RATE_INVALID 
      });
    }
    
    // Get or create config and update coinToRupeeConversionRate
    let config = await AdminConfig.getConfig();
    config.coinToRupeeConversionRate = numericValue;
    await config.save();
    
    return res.json({
      success: true,
      message: messages.ADMIN.CONVERSION_RATE_UPDATED,
      data: {
        coinToRupeeConversionRate: config.coinToRupeeConversionRate
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Update minimum withdrawal amount
exports.updateMinWithdrawalAmount = async (req, res) => {
  try {
    const { minWithdrawalAmount } = req.body;
    
    // Validate input
    if (minWithdrawalAmount === undefined || minWithdrawalAmount === null) {
      return res.status(400).json({ 
        success: false, 
        message: messages.ADMIN.MIN_WITHDRAWAL_REQUIRED 
      });
    }
    
    const numericValue = Number(minWithdrawalAmount);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: messages.ADMIN.MIN_WITHDRAWAL_INVALID 
      });
    }
    
    // Get or create config and update minWithdrawalAmount
    let config = await AdminConfig.getConfig();
    config.minWithdrawalAmount = numericValue;
    await config.save();
    
    return res.json({
      success: true,
      message: messages.ADMIN.MIN_WITHDRAWAL_UPDATED,
      data: {
        minWithdrawalAmount: config.minWithdrawalAmount
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Set/Update referral bonus
exports.setReferralBonus = async (req, res) => {
  try {
    const { bonus, femaleReferralBonus, agencyReferralBonus, maleReferralBonus } = req.body;

    const config = await AdminConfig.getConfig();
    
    // Handle backward compatibility: if 'bonus' is provided, map it to femaleReferralBonus
    if (bonus !== undefined && bonus !== null) {
      const numericValue = Number(bonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: messages.ADMIN.BONUS_INVALID 
        });
      }
      config.femaleReferralBonus = numericValue; // Map old bonus to female bonus for backward compatibility
    }
    
    // Update female referral bonus if provided
    if (femaleReferralBonus !== undefined && femaleReferralBonus !== null) {
      const numericValue = Number(femaleReferralBonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'femaleReferralBonus must be a valid non-negative number' 
        });
      }
      config.femaleReferralBonus = numericValue;
    }
    
    // Update agency referral bonus if provided
    if (agencyReferralBonus !== undefined && agencyReferralBonus !== null) {
      const numericValue = Number(agencyReferralBonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'agencyReferralBonus must be a valid non-negative number' 
        });
      }
      config.agencyReferralBonus = numericValue;
    }
    
    // Update male referral bonus if provided
    if (maleReferralBonus !== undefined && maleReferralBonus !== null) {
      const numericValue = Number(maleReferralBonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'maleReferralBonus must be a valid non-negative number' 
        });
      }
      config.maleReferralBonus = numericValue;
    }

    await config.save();

    res.json({
      success: true,
      message: messages.ADMIN.BONUS_UPDATED,
      data: {
        femaleReferralBonus: config.femaleReferralBonus,
        agencyReferralBonus: config.agencyReferralBonus,
        maleReferralBonus: config.maleReferralBonus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get referral bonus
exports.getReferralBonus = async (req, res) => {
  try {
    const config = await AdminConfig.getConfig();
    return res.json({
      success: true,
      data: {
        femaleReferralBonus: config.femaleReferralBonus,
        agencyReferralBonus: config.agencyReferralBonus,
        maleReferralBonus: config.maleReferralBonus
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Update referral bonus (alternative to POST)
exports.updateReferralBonus = async (req, res) => {
  try {
    const { bonus, femaleReferralBonus, agencyReferralBonus, maleReferralBonus } = req.body;

    const config = await AdminConfig.getConfig();
    
    // Handle backward compatibility: if 'bonus' is provided, map it to femaleReferralBonus
    if (bonus !== undefined && bonus !== null) {
      const numericValue = Number(bonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: messages.ADMIN.BONUS_INVALID 
        });
      }
      config.femaleReferralBonus = numericValue; // Map old bonus to female bonus for backward compatibility
    }
    
    // Update female referral bonus if provided
    if (femaleReferralBonus !== undefined && femaleReferralBonus !== null) {
      const numericValue = Number(femaleReferralBonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'femaleReferralBonus must be a valid non-negative number' 
        });
      }
      config.femaleReferralBonus = numericValue;
    }
    
    // Update agency referral bonus if provided
    if (agencyReferralBonus !== undefined && agencyReferralBonus !== null) {
      const numericValue = Number(agencyReferralBonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'agencyReferralBonus must be a valid non-negative number' 
        });
      }
      config.agencyReferralBonus = numericValue;
    }
    
    // Update male referral bonus if provided
    if (maleReferralBonus !== undefined && maleReferralBonus !== null) {
      const numericValue = Number(maleReferralBonus);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'maleReferralBonus must be a valid non-negative number' 
        });
      }
      config.maleReferralBonus = numericValue;
    }

    await config.save();

    res.json({
      success: true,
      message: messages.ADMIN.BONUS_UPDATED,
      data: {
        femaleReferralBonus: config.femaleReferralBonus,
        agencyReferralBonus: config.agencyReferralBonus,
        maleReferralBonus: config.maleReferralBonus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete/reset referral bonus (set to default value)
exports.deleteReferralBonus = async (req, res) => {
  try {
    const config = await AdminConfig.getConfig();
    const previousBonus = config.referralBonus;
    const previousFemaleBonus = config.femaleReferralBonus;
    const previousAgencyBonus = config.agencyReferralBonus;
    
    config.referralBonus = 100; // Reset to default value
    config.femaleReferralBonus = 100; // Reset to default value
    config.agencyReferralBonus = 0; // Reset to default value
    
    await config.save();

    res.json({
      success: true,
      message: messages.ADMIN.BONUS_RESET,
      data: {
        previousBonus: previousBonus,
        previousFemaleBonus: previousFemaleBonus,
        previousAgencyBonus: previousAgencyBonus,
        newBonus: config.referralBonus,
        newFemaleBonus: config.femaleReferralBonus,
        newAgencyBonus: config.agencyReferralBonus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update call margin settings for agency females - REMOVED
// Margins are now handled by AdminLevelConfig per level

// Update call margin settings for non-agency females - REMOVED
// Margins are now handled by AdminLevelConfig per level

// Update admin share percentage from platform margin
exports.updateAdminSharePercentage = async (req, res) => {
  try {
    const { adminSharePercentage } = req.body;
    
    // Validate input
    if (adminSharePercentage === undefined || adminSharePercentage === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'adminSharePercentage is required' 
      });
    }
    
    const numericValue = Number(adminSharePercentage);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'adminSharePercentage must be a valid number between 0 and 100' 
      });
    }
    
    if (numericValue < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'adminSharePercentage must be at least 10% to ensure platform revenue' 
      });
    }
    
    // Get or create config and update adminSharePercentage
    let config = await AdminConfig.getConfig();
    config.adminSharePercentage = numericValue;
    await config.save();
    
    return res.json({
      success: true,
      message: 'Admin share percentage updated successfully',
      data: {
        adminSharePercentage: config.adminSharePercentage
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Update nearby distance settings
exports.updateNearbyDistance = async (req, res) => {
  try {
    const { nearbyDistanceValue, nearbyDistanceUnit } = req.body;
    
    // Validate input
    if (nearbyDistanceValue === undefined || nearbyDistanceValue === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'nearbyDistanceValue is required' 
      });
    }
    
    const numericValue = Number(nearbyDistanceValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'nearbyDistanceValue must be a valid positive number' 
      });
    }
    
    // Validate unit if provided
    if (nearbyDistanceUnit && !['m', 'km'].includes(nearbyDistanceUnit)) {
      return res.status(400).json({ 
        success: false, 
        message: 'nearbyDistanceUnit must be either "m" (meters) or "km" (kilometers)' 
      });
    }
    
    // Get or create config and update nearby distance settings
    let config = await AdminConfig.getConfig();
    config.nearbyDistanceValue = numericValue;
    if (nearbyDistanceUnit) {
      config.nearbyDistanceUnit = nearbyDistanceUnit;
    }
    await config.save();
    
    return res.json({
      success: true,
      message: 'Nearby distance settings updated successfully',
      data: {
        nearbyDistanceValue: config.nearbyDistanceValue,
        nearbyDistanceUnit: config.nearbyDistanceUnit
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Get nearby distance settings
exports.getNearbyDistance = async (req, res) => {
  try {
    const config = await AdminConfig.getConfig();
    return res.json({
      success: true,
      data: {
        nearbyDistanceValue: config.nearbyDistanceValue,
        nearbyDistanceUnit: config.nearbyDistanceUnit
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Update new user window days
exports.updateNewUserWindowDays = async (req, res) => {
  try {
    const { newUserWindowDays } = req.body;
    
    // Validate input
    if (newUserWindowDays === undefined || newUserWindowDays === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'newUserWindowDays is required' 
      });
    }
    
    const numericValue = Number(newUserWindowDays);
    if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 365) {
      return res.status(400).json({ 
        success: false, 
        message: 'newUserWindowDays must be a valid number between 1 and 365' 
      });
    }
    
    // Get or create config and update newUserWindowDays
    let config = await AdminConfig.getConfig();
    config.newUserWindowDays = numericValue;
    await config.save();
    
    return res.json({
      success: true,
      message: 'New user window days updated successfully',
      data: {
        newUserWindowDays: config.newUserWindowDays
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Get new user window days
exports.getNewUserWindowDays = async (req, res) => {
  try {
    const config = await AdminConfig.getConfig();
    return res.json({
      success: true,
      data: {
        newUserWindowDays: config.newUserWindowDays
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};
