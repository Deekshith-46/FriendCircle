const AgencyUser = require('../../models/agency/AgencyUser');
const AgencyImage = require('../../models/agency/Image');
const generateToken = require('../../utils/generateToken');
const sendOtp = require('../../utils/sendOtp');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const { checkAndMarkAgencyProfileCompleted } = require('../../utils/agencyProfileChecker');

// Agency Registration (Email and Mobile Number) - ONLY ONCE PER USER
exports.agencyRegister = async (req, res) => {
  const { email, mobileNumber, referralCode } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit OTP

  try {
    // Validate email and mobile number
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }
    
    if (!isValidMobile(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: messages.VALIDATION.INVALID_MOBILE
      });
    }

    // ⚠️ Check if agency already exists
    const existingAgency = await AgencyUser.findOne({ $or: [{ email }, { mobileNumber }] });
    
    if (existingAgency) {
      // If agency exists but is not verified, allow re-registration
      if (!existingAgency.isVerified || !existingAgency.isActive) {
        // Update existing agency with new OTP and referral info
        const otp = Math.floor(1000 + Math.random() * 9000);
        existingAgency.otp = otp;
        existingAgency.isVerified = false;
        existingAgency.isActive = false;
        existingAgency.profileCompleted = false;
        existingAgency.reviewStatus = 'completeProfile';
        
        // Handle referral code if provided
        if (referralCode) {
          const referredByAgency = await AgencyUser.findOne({ referralCode });
          if (referredByAgency) {
            existingAgency.referredByAgency = [referredByAgency._id];
          }
        }
        
        await existingAgency.save();
        await sendOtp(email, otp);
        
        return res.status(201).json({
          success: true,
          message: messages.AUTH.OTP_SENT_EMAIL,
          referralCode: existingAgency.referralCode,
          otp: otp // For testing purposes
        });
      } else {
        // Agency is already verified and active - REJECT signup
        return res.status(400).json({ 
          success: false, 
          message: 'Agency already exists, please login',
          redirectTo: 'LOGIN'
        });
      }
    }

    // Generate unique referral code for new user
    const generateReferralCode = require('../../utils/generateReferralCode');
    let myReferral = generateReferralCode();
    while (await AgencyUser.findOne({ referralCode: myReferral })) {
      myReferral = generateReferralCode();
    }

    // Link referral if provided: can be an AgencyUser code
    let referredByAgency = null;
    if (referralCode) {
      referredByAgency = await AgencyUser.findOne({ referralCode });
    }

    // Create new agency with initial state
    const newAgency = new AgencyUser({ 
      email, 
      mobileNumber, 
      otp, 
      referralCode: myReferral, 
      referredByAgency: referredByAgency ? [referredByAgency._id] : [],
      isVerified: false,      // Will be true after OTP verification
      isActive: false,        // Will be true after OTP verification
      profileCompleted: false, // Will be true after profile completion
      reviewStatus: 'completeProfile' // Initial state
    });
    await newAgency.save();
    await sendOtp(email, otp); // Send OTP via SendGrid

    res.status(201).json({
      success: true,
      message: messages.AUTH.OTP_SENT_EMAIL,
      otp: otp // For testing purposes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Login Agency User (Send OTP) - ALWAYS ALLOWED AFTER OTP VERIFICATION
exports.agencyLogin = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    // Check if the agency exists
    const agency = await AgencyUser.findOne({ email });
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Check if agency is verified (OTP verified during signup)
    if (!agency.isVerified) {
      return res.status(400).json({ success: false, message: messages.AUTH.ACCOUNT_NOT_VERIFIED });
    }
    
    // Check if agency is active
    if (agency.status === 'inactive') {
      return res.status(403).json({ success: false, message: messages.AUTH.ACCOUNT_DEACTIVATED });
    }

    // Generate new OTP for login
    const otp = Math.floor(1000 + Math.random() * 9000);
    agency.otp = otp;
    await agency.save();

    // Send OTP via email
    await sendOtp(email, otp);

    res.json({
      success: true,
      message: messages.AUTH.OTP_SENT_LOGIN,
      otp: otp // For testing purposes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Verify Login OTP - Returns reviewStatus-based response
exports.agencyVerifyLoginOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const agency = await AgencyUser.findOne({ otp, isVerified: true });
    
    if (agency) {
      // Clear OTP after successful login
      agency.otp = undefined;
      await agency.save();

      // Generate JWT token
      const token = generateToken(agency._id, 'agency');

      // Determine redirect based on reviewStatus
      let redirectTo = 'COMPLETE_PROFILE'; // default
      
      if (agency.reviewStatus === 'completeProfile') {
        redirectTo = 'COMPLETE_PROFILE';
      } else if (agency.reviewStatus === 'pending') {
        redirectTo = 'UNDER_REVIEW';
      } else if (agency.reviewStatus === 'accepted') {
        redirectTo = 'DASHBOARD';
      } else if (agency.reviewStatus === 'rejected') {
        redirectTo = 'REJECTED';
      }

      res.json({
        success: true,
        message: messages.AUTH.LOGIN_SUCCESS,
        token,
        data: {
          agency: {
            id: agency._id,
            firstName: agency.firstName,
            lastName: agency.lastName,
            email: agency.email,
            mobileNumber: agency.mobileNumber,
            profileCompleted: agency.profileCompleted,
            reviewStatus: agency.reviewStatus
          },
          redirectTo: redirectTo
        }
      });
    } else {
      res.status(400).json({ success: false, message: messages.COMMON.INVALID_OTP });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// OTP Verification for Registration
exports.agencyVerifyOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const agency = await AgencyUser.findOne({ otp, isVerified: false });

    if (agency) {
      const token = generateToken(agency._id, 'agency');
      
      // After OTP verification:
      agency.isVerified = true;  // Mark as verified
      agency.isActive = true;    // Mark as active
      agency.otp = undefined;    // Clear OTP
      agency.status = 'active';  // Set status to active
      agency.reviewStatus = 'completeProfile'; // Ensure status is completeProfile
      // profileCompleted remains false until profile is completed

      await agency.save();
      
      res.json({ 
        success: true, 
        token,
        message: messages.AUTH.OTP_VERIFIED,
        data: {
          profileCompleted: false,
          reviewStatus: 'completeProfile',
          redirectTo: 'COMPLETE_PROFILE'
        }
      });
    } else {
      res.status(400).json({ success: false, message: messages.COMMON.INVALID_OTP });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Complete agency profile - accepts form-data with details and optional image
exports.completeAgencyProfile = async (req, res) => {
  try {
    const { firstName, lastName, aadharOrPanNum } = req.body;
    
    // Helper function to clean form-data values that might be JSON-encoded strings
    const cleanValue = (value) => {
      if (typeof value === 'string') {
        // Remove surrounding quotes if present
        const trimmed = value.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        // Try to parse as JSON in case it's a JSON-encoded string
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            return value;
          }
        }
        return value;
      }
      return value;
    };
    
    const agency = await AgencyUser.findById(req.user.id);
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Check if profile is already completed
    if (agency.profileCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile already completed' 
      });
    }

    // Clean and validate required fields
    const cleanedFirstName = cleanValue(firstName);
    const cleanedLastName = cleanValue(lastName);
    const cleanedAadharOrPanNum = cleanValue(aadharOrPanNum);
    
    if (!cleanedFirstName || !cleanedLastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'First name and last name are required' 
      });
    }

    // Validate that aadharOrPanNum is provided
    if (!cleanedAadharOrPanNum) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aadhar or PAN number is required' 
      });
    }

    // Update agency details
    agency.firstName = cleanedFirstName;
    agency.lastName = cleanedLastName;
    agency.aadharOrPanNum = cleanedAadharOrPanNum;
    
    // Handle image upload if provided
    if (req.file) {
      // Upload image to Cloudinary
      const uploadToCloudinary = require('../../utils/cloudinaryUpload');
      const result = await uploadToCloudinary(req.file.buffer, 'agency_images');
      const imageUrl = result.secure_url;
      
      // Create image record
      const imageRecord = new AgencyImage({ agencyUserId: req.user.id, imageUrl });
      await imageRecord.save();
      
      agency.image = imageUrl;
    }

    await agency.save();

    // Check if both details and image are provided to mark profile as completed
    const profileCompleted = await checkAndMarkAgencyProfileCompleted(agency._id);
    
    // Reload agency to get updated values after profile completion check
    const updatedAgency = await AgencyUser.findById(req.user.id);

    res.json({ 
      success: true, 
      message: profileCompleted ? 'Profile completed and submitted for review' : 'Agency details saved successfully',
      data: {
        firstName: updatedAgency.firstName,
        lastName: updatedAgency.lastName,
        aadharOrPanNum: updatedAgency.aadharOrPanNum,
        image: updatedAgency.image,
        profileCompleted: updatedAgency.profileCompleted,
        reviewStatus: updatedAgency.reviewStatus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update agency profile details
exports.updateAgencyProfile = async (req, res) => {
  try {
    const { firstName, lastName, aadharOrPanNum } = req.body;
    
    // Helper function to clean form-data values that might be JSON-encoded strings
    const cleanValue = (value) => {
      if (typeof value === 'string') {
        // Remove surrounding quotes if present
        const trimmed = value.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        // Try to parse as JSON in case it's a JSON-encoded string
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            return value;
          }
        }
        return value;
      }
      return value;
    };
    
    const agency = await AgencyUser.findById(req.user.id);
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Clean the input values
    const cleanedFirstName = cleanValue(firstName);
    const cleanedLastName = cleanValue(lastName);
    const cleanedAadharOrPanNum = cleanValue(aadharOrPanNum);
    
    // Update agency details if provided
    if (cleanedFirstName) agency.firstName = cleanedFirstName;
    if (cleanedLastName) agency.lastName = cleanedLastName;
    if (cleanedAadharOrPanNum) agency.aadharOrPanNum = cleanedAadharOrPanNum;
    
    // Handle image upload if provided
    if (req.file) {
      // Upload image to Cloudinary
      const uploadToCloudinary = require('../../utils/cloudinaryUpload');
      const result = await uploadToCloudinary(req.file.buffer, 'agency_images');
      const imageUrl = result.secure_url;
      
      // Create image record
      const imageRecord = new AgencyImage({ agencyUserId: req.user.id, imageUrl });
      await imageRecord.save();
      
      agency.image = imageUrl;
    }

    await agency.save();

    // Check if both details and image are provided to mark profile as completed
    const profileCompleted = await checkAndMarkAgencyProfileCompleted(agency._id);
    
    // Reload agency to get updated values after profile completion check
    const updatedAgency = await AgencyUser.findById(req.user.id);

    res.json({ 
      success: true, 
      message: profileCompleted ? 'Profile completed and submitted for review' : 'Agency details updated successfully',
      data: {
        firstName: updatedAgency.firstName,
        lastName: updatedAgency.lastName,
        aadharOrPanNum: updatedAgency.aadharOrPanNum,
        image: updatedAgency.image,
        profileCompleted: updatedAgency.profileCompleted,
        reviewStatus: updatedAgency.reviewStatus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get agency profile
exports.agencyMe = async (req, res) => {
  try {
    const agency = await AgencyUser.findById(req.user.id)
      .select('-otp')
      .populate({
        path: 'referredByAgency',
        select: 'firstName lastName email'
      });
    if (!agency) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    
    res.json({ success: true, data: agency });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update review status and award referral bonus if applicable
exports.updateReviewStatus = async (req, res) => {
  try {
    const { userId, reviewStatus } = req.body;
    
    const agency = await AgencyUser.findById(userId);
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    const oldReviewStatus = agency.reviewStatus;
    agency.reviewStatus = reviewStatus;
    await agency.save();
    
    // Note: Referral bonus is handled only in admin approval, not in user-side review status update
    
    return res.json({
      success: true,
      message: 'Review status updated successfully',
      data: {
        userId: agency._id,
        reviewStatus: agency.reviewStatus
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
