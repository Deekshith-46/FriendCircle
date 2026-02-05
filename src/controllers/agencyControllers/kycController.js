const AgencyKYC = require('../../models/agency/KYC');
const mongoose = require('mongoose');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const notificationService = require('../../services/notificationService');
const notificationEvents = require('../../constants/notificationEvents');

// Submit/Update KYC for agency
exports.submitKYC = async (req, res) => {
  const { method, accountDetails, upiId } = req.body;

  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id);

    // Check conditions for submitting KYC
    if (!user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Profile must be completed before submitting KYC'
      });
    }

    if (user.reviewStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Account must be approved before submitting KYC'
      });
    }

    // Update existing KYC record or create new one
    let kyc = await AgencyKYC.findOne({ user: req.user.id, method });
    
    if (kyc) {
      // Update existing record
      kyc.accountDetails = accountDetails;
      kyc.upiId = upiId;
      kyc.status = 'pending'; // Reset status for re-verification
      await kyc.save();
    } else {
      // Create new record
      kyc = new AgencyKYC({
        user: req.user.id,
        method,
        accountDetails,
        upiId
      });
      await kyc.save();
    }

    // Initialize kycDetails
    if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
      user.kycDetails = {
        bank: {},
        upi: {}
      };
    }

    if (method === "account_details" && accountDetails) {
      user.kycDetails.bank = {
        _id: new mongoose.Types.ObjectId(),
        name: accountDetails.name,
        accountNumber: accountDetails.accountNumber,
        ifsc: accountDetails.ifsc,
        status: 'pending',
        verifiedAt: null
      };
    }

    if (method === "upi_id" && upiId) {
      user.kycDetails.upi = {
        _id: new mongoose.Types.ObjectId(),
        upiId: upiId,
        status: 'pending',
        verifiedAt: null
      };
    }

    // ALWAYS force re-verification when something changes
    user.kycStatus = 'pending';

    await user.save();

    // Notify admin
    notificationService.handleEvent(
      notificationEvents.KYC_SUBMITTED,
      {
        entityId: req.user.id,
        entityType: 'agency',
        method
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Details submitted. Waiting for admin verification.',
      redirectTo: 'UNDER_REVIEW'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get current payout account details for agency
exports.getPayoutDetails = async (req, res) => {
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id).select('kycDetails kycStatus');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const payoutDetails = {
      kycStatus: user.kycStatus
    };
    
    // Add bank details if they exist
    if (user.kycDetails?.bank?._id) {
      payoutDetails.bank = {
        id: user.kycDetails.bank._id,
        name: user.kycDetails.bank.name,
        accountNumber: user.kycDetails.bank.accountNumber,
        ifsc: user.kycDetails.bank.ifsc,
        status: user.kycDetails.bank.status,
        verifiedAt: user.kycDetails.bank.verifiedAt
      };
    }
    
    // Add UPI details if they exist
    if (user.kycDetails?.upi?._id) {
      payoutDetails.upi = {
        id: user.kycDetails.upi._id,
        upiId: user.kycDetails.upi.upiId,
        status: user.kycDetails.upi.status,
        verifiedAt: user.kycDetails.upi.verifiedAt
      };
    }
    
    // Determine redirect based on status
    const redirectTo = user.kycStatus === 'accepted' ? 'VERIFICATION_DONE' : 'UNDER_REVIEW';
    
    return res.status(200).json({
      success: true,
      data: payoutDetails,
      redirectTo
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Add new bank account details for agency (only if doesn't exist)
exports.addBankAccount = async (req, res) => {
  const { name, accountNumber, ifsc } = req.body;
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id);

    // Check conditions for submitting KYC
    if (!user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Profile must be completed before submitting KYC'
      });
    }

    if (user.reviewStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Account must be approved before submitting KYC'
      });
    }

    // Check if bank details already exist
    if (user.kycDetails?.bank?._id) {
      return res.status(400).json({
        success: false,
        message: 'Bank account details already exist. Please use PUT method to update.'
      });
    }

    // Validate required fields
    if (!name || !accountNumber || !ifsc) {
      return res.status(400).json({
        success: false,
        message: 'Name, account number, and IFSC code are required'
      });
    }

    // Check for existing KYC record
    const existingKyc = await AgencyKYC.findOne({ user: req.user.id, method: 'account_details' });
    if (existingKyc) {
      return res.status(400).json({
        success: false,
        message: 'Bank account details already exist. Please use PUT method to update.'
      });
    }

    // Create new record
    const kyc = new AgencyKYC({ user: req.user.id, method: 'account_details', accountDetails: { name, accountNumber, ifsc } });
    await kyc.save();

    // Initialize kycDetails with new structure if it doesn't exist or has old structure
    if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
      user.kycDetails = {
        bank: {},
        upi: {}
      };
    }

    // Set bank details with pending status
    user.kycDetails.bank = {
      _id: new mongoose.Types.ObjectId(),
      name: name,
      accountNumber: accountNumber,
      ifsc: ifsc,
      status: 'pending',
      verifiedAt: null
    };

    // Update overall kycStatus to pending since new details are added
    user.kycStatus = 'pending';

    await user.save();

    // Notify admin about new KYC submission
    notificationService.handleEvent(
      notificationEvents.KYC_SUBMITTED,
      {
        entityId: req.user.id,
        entityType: 'agency',
        method: 'account_details'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Bank account details submitted for verification.',
      data: {
        id: user.kycDetails.bank._id,
        name,
        accountNumber,
        ifsc,
        status: 'pending'
      },
      redirectTo: 'UNDER_REVIEW'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update existing bank account details for agency
exports.updateBankAccount = async (req, res) => {
  const { name, accountNumber, ifsc } = req.body;
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id);

    // Check conditions for submitting KYC
    if (!user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Profile must be completed before submitting KYC'
      });
    }

    if (user.reviewStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Account must be approved before submitting KYC'
      });
    }

    // Validate required fields
    if (!name || !accountNumber || !ifsc) {
      return res.status(400).json({
        success: false,
        message: 'Name, account number, and IFSC code are required'
      });
    }

    // Update existing KYC record for bank details
    let kyc = await AgencyKYC.findOne({ user: req.user.id, method: 'account_details' });
    
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'Bank account details not found'
      });
    }

    // Update existing record
    kyc.accountDetails = { name, accountNumber, ifsc };
    kyc.status = 'pending'; // Reset status for re-verification
    await kyc.save();

    // Update user's kycDetails
    user.kycDetails = user.kycDetails || { bank: {}, upi: {} };
    user.kycDetails.bank = {
      _id: user.kycDetails.bank._id,
      name: name,
      accountNumber: accountNumber,
      ifsc: ifsc,
      status: 'pending',
      verifiedAt: null
    };

    // Update overall kycStatus to pending since details are updated
    user.kycStatus = 'pending';

    await user.save();

    // Notify admin about KYC update
    notificationService.handleEvent(
      notificationEvents.KYC_SUBMITTED,
      {
        entityId: req.user.id,
        entityType: 'agency',
        method: 'account_details'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Bank account details updated and submitted for verification.',
      data: {
        id: user.kycDetails.bank._id,
        name,
        accountNumber,
        ifsc,
        status: 'pending'
      },
      redirectTo: 'UNDER_REVIEW'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get bank account details for agency
exports.getBankAccount = async (req, res) => {
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id).select('kycDetails kycStatus');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if bank details exist
    if (!user.kycDetails?.bank?._id) {
      return res.status(404).json({
        success: false,
        message: 'Bank account details not found'
      });
    }
    
    const bankDetails = {
      id: user.kycDetails.bank._id,
      name: user.kycDetails.bank.name,
      accountNumber: user.kycDetails.bank.accountNumber,
      ifsc: user.kycDetails.bank.ifsc,
      status: user.kycDetails.bank.status,
      verifiedAt: user.kycDetails.bank.verifiedAt
    };
    
    // Determine redirect based on status
    const redirectTo = user.kycStatus === 'accepted' ? 'VERIFICATION_DONE' : 'UNDER_REVIEW';
    
    return res.status(200).json({
      success: true,
      data: bankDetails,
      redirectTo
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add new UPI details for agency (only if doesn't exist)
exports.addUpiAccount = async (req, res) => {
  const { upiId } = req.body;
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id);

    // Check conditions for submitting KYC
    if (!user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Profile must be completed before submitting KYC'
      });
    }

    if (user.reviewStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Account must be approved before submitting KYC'
      });
    }

    // Check if UPI details already exist
    if (user.kycDetails?.upi?._id) {
      return res.status(400).json({
        success: false,
        message: 'UPI details already exist. Please use PUT method to update.'
      });
    }

    // Validate required field
    if (!upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID is required'
      });
    }

    // Check for existing KYC record
    const existingKyc = await AgencyKYC.findOne({ user: req.user.id, method: 'upi_id' });
    if (existingKyc) {
      return res.status(400).json({
        success: false,
        message: 'UPI details already exist. Please use PUT method to update.'
      });
    }

    // Create new record
    const kyc = new AgencyKYC({ user: req.user.id, method: 'upi_id', upiId });
    await kyc.save();

    // Initialize kycDetails with new structure if it doesn't exist or has old structure
    if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
      user.kycDetails = {
        bank: {},
        upi: {}
      };
    }

    // Set UPI details with pending status
    user.kycDetails.upi = {
      _id: new mongoose.Types.ObjectId(),
      upiId: upiId,
      status: 'pending',
      verifiedAt: null
    };

    // Update overall kycStatus to pending since new details are added
    user.kycStatus = 'pending';

    await user.save();

    // Notify admin about new KYC submission
    notificationService.handleEvent(
      notificationEvents.KYC_SUBMITTED,
      {
        entityId: req.user.id,
        entityType: 'agency',
        method: 'upi_id'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'UPI details submitted for verification.',
      data: {
        id: user.kycDetails.upi._id,
        upiId,
        status: 'pending'
      },
      redirectTo: 'UNDER_REVIEW'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update existing UPI details for agency
exports.updateUpiAccount = async (req, res) => {
  const { upiId } = req.body;
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id);

    // Check conditions for submitting KYC
    if (!user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Profile must be completed before submitting KYC'
      });
    }

    if (user.reviewStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Account must be approved before submitting KYC'
      });
    }

    // Validate required field
    if (!upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID is required'
      });
    }

    // Update existing KYC record for UPI details
    let kyc = await AgencyKYC.findOne({ user: req.user.id, method: 'upi_id' });
    
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'UPI details not found'
      });
    }

    // Update existing record
    kyc.upiId = upiId;
    kyc.status = 'pending'; // Reset status for re-verification
    await kyc.save();

    // Update user's kycDetails
    user.kycDetails = user.kycDetails || { bank: {}, upi: {} };
    user.kycDetails.upi = {
      _id: user.kycDetails.upi._id,
      upiId: upiId,
      status: 'pending',
      verifiedAt: null
    };

    // Update overall kycStatus to pending since details are updated
    user.kycStatus = 'pending';

    await user.save();

    // Notify admin about KYC update
    notificationService.handleEvent(
      notificationEvents.KYC_SUBMITTED,
      {
        entityId: req.user.id,
        entityType: 'agency',
        method: 'upi_id'
      }
    );

    return res.status(200).json({
      success: true,
      message: 'UPI details updated and submitted for verification.',
      data: {
        id: user.kycDetails.upi._id,
        upiId,
        status: 'pending'
      },
      redirectTo: 'UNDER_REVIEW'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get UPI details for agency
exports.getUpiAccount = async (req, res) => {
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const user = await AgencyUser.findById(req.user.id).select('kycDetails kycStatus');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if UPI details exist
    if (!user.kycDetails?.upi?._id) {
      return res.status(404).json({
        success: false,
        message: 'UPI details not found'
      });
    }
    
    const upiDetails = {
      id: user.kycDetails.upi._id,
      upiId: user.kycDetails.upi.upiId,
      status: user.kycDetails.upi.status,
      verifiedAt: user.kycDetails.upi.verifiedAt
    };
    
    // Determine redirect based on status
    const redirectTo = user.kycStatus === 'accepted' ? 'VERIFICATION_DONE' : 'UNDER_REVIEW';
    
    return res.status(200).json({
      success: true,
      data: upiDetails,
      redirectTo
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin can verify KYC for agency
exports.verifyKYC = async (req, res) => {
  const { kycId, status } = req.body;
  try {
    const AgencyUser = require('../../models/agency/AgencyUser');
    const kyc = await AgencyKYC.findById(kycId);
    kyc.status = status;
    await kyc.save();

    // Update user's KYC status based on admin decision
    const user = await AgencyUser.findById(kyc.user);

    // Initialize kycDetails with new structure if it doesn't exist or has old structure
    if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
      user.kycDetails = {
        bank: {},
        upi: {}
      };
    }

    if (kyc.method === 'account_details' && kyc.accountDetails) {
      // Update bank details with status and verified timestamp
      user.kycDetails.bank = {
        _id: user.kycDetails.bank._id || new mongoose.Types.ObjectId(),
        name: kyc.accountDetails.name,
        accountNumber: kyc.accountDetails.accountNumber,
        ifsc: kyc.accountDetails.ifsc,
        status: status === 'approved' ? 'accepted' : status,
        verifiedAt: status === 'approved' ? new Date() : user.kycDetails.bank.verifiedAt
      };
    } else if (kyc.method === 'upi_id' && kyc.upiId) {
      // Update UPI details with status and verified timestamp
      user.kycDetails.upi = {
        _id: user.kycDetails.upi._id || new mongoose.Types.ObjectId(),
        upiId: kyc.upiId,
        status: status === 'approved' ? 'accepted' : status,
        verifiedAt: status === 'approved' ? new Date() : user.kycDetails.upi.verifiedAt
      };
    }

    // Update overall KYC status based on all methods
    if (status === 'approved' || status === 'rejected') {
      // Calculate overall kycStatus based on all payout methods
      const hasAcceptedMethod = (user.kycDetails.bank?.status === 'accepted' || 
                               user.kycDetails.upi?.status === 'accepted');
      const hasPendingMethod = (user.kycDetails.bank?.status === 'pending' || 
                               user.kycDetails.upi?.status === 'pending');
      
      // If any method is pending, overall status is pending for review
      user.kycStatus = hasPendingMethod ? 'pending' : (hasAcceptedMethod ? 'accepted' : 'pending');
    } else {
      user.kycStatus = 'pending';
    }

    // Determine redirect page based on status
    const redirectTo = status === 'approved' ? 'APPROVED' : 'UNDER_REVIEW';


    await user.save();

    // Notify user about KYC status change
    notificationService.handleEvent(
      status === 'approved' ? notificationEvents.KYC_APPROVED : notificationEvents.KYC_REJECTED,
      {
        entityId: kyc.user,
        entityType: 'agency',
        status,
        processedBy: 'admin'
      }
    );

    res.json({ 
      success: true, 
      data: kyc,
      message: status === 'approved' ? 'KYC approved successfully' : 'KYC rejected',
      redirectTo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get agency KYC status
exports.getKYCStatus = async (req, res) => {
  try {
    const kyc = await AgencyKYC.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: kyc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};