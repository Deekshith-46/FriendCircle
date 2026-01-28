// /controllers/femaleUserControllers/kycController.js
const KYC = require('../../models/femaleUser/KYC');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const mongoose = require('mongoose');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');

// Submit KYC
exports.submitKYC = async (req, res) => {
  const { method, accountDetails, upiId } = req.body;
  try {
    const user = await FemaleUser.findById(req.user.id);
    
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
    
    const kyc = new KYC({ user: req.user.id, method, accountDetails, upiId });
    await kyc.save();
    
    // Initialize kycDetails with new structure if it doesn't exist or has old structure
    if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
      user.kycDetails = {
        bank: {},
        upi: {}
      };
    }
    
    if (method === "account_details" && accountDetails) {
      // Set bank details with pending status
      user.kycDetails.bank = {
        _id: new mongoose.Types.ObjectId(),
        name: accountDetails.name,
        accountNumber: accountDetails.accountNumber,
        ifsc: accountDetails.ifsc,
        status: 'pending',
        verifiedAt: null
      };
      
      // Update overall kycStatus if no approved method exists
      if (user.kycStatus === 'completeKyc') {
        user.kycStatus = 'pending';
      }
    }
    
    if (method === "upi_id" && upiId) {
      // Set UPI details with pending status
      user.kycDetails.upi = {
        _id: new mongoose.Types.ObjectId(),
        upiId: upiId,
        status: 'pending',
        verifiedAt: null
      };
      
      // Update overall kycStatus if no approved method exists
      if (user.kycStatus === 'completeKyc') {
        user.kycStatus = 'pending';
      }
    }
    
    await user.save();
    
    res.json({ success: true, message: "KYC submitted for verification." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin can verify KYC
exports.verifyKYC = async (req, res) => {
  const { kycId, status } = req.body;
  try {
    const kyc = await KYC.findById(kycId);
    kyc.status = status;
    await kyc.save();
    
    // Also update user's kycDetails field
    const user = await FemaleUser.findById(kyc.user);
    
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
    if (status === 'approved') {
      user.kycStatus = 'accepted';
    } else if (status === 'rejected') {
      // Check if any other method is still accepted, otherwise set to rejected
      const hasAcceptedMethod = 
        (user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') ||
        (user.kycDetails.upi && user.kycDetails.upi.status === 'accepted');
      
      if (!hasAcceptedMethod) {
        user.kycStatus = 'rejected';
      }
    }
    
    await user.save();
    
    res.json({ success: true, data: kyc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};