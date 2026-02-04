const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');
const AgencyUser = require('../../models/agency/AgencyUser');
const FemaleBlockList = require('../../models/femaleUser/BlockList');
const MaleBlockList = require('../../models/maleUser/BlockList');
const generateToken = require('../../utils/generateToken');
const sendOtp = require('../../utils/sendOtp');
const FemaleImage = require('../../models/femaleUser/Image');
const AdminConfig = require('../../models/admin/AdminConfig');
const WithdrawalRequest = require('../../models/common/WithdrawalRequest');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const notificationService = require('../../services/notificationService');
const notificationEvents = require('../../constants/notificationEvents');
const ChatRoom = require('../../models/chat/ChatRoom');
const Message = require('../../models/chat/Message');
const Transaction = require('../../models/common/Transaction');

// Helper function to award referral bonuses
const awardReferralBonus = async (user, adminConfig) => {
  if (!user || !adminConfig || user.referralBonusAwarded) {
    return false; // No user, no config, or bonus already awarded
  }
  
  const Transaction = require('../../models/common/Transaction');
  
  try {
    // Determine referral bonus amount based on referral source
    let referralBonusAmount;
    let referrer;
    
    if (user.referredByFemale) {
      // Female user referred by another female user
      referralBonusAmount = adminConfig.femaleReferralBonus || 100;
      const FemaleModel = require('../../models/femaleUser/FemaleUser');
      referrer = await FemaleModel.findById(user.referredByFemale);
      
      if (referrer) {
        // Add referral bonus to both referrer and referred user's wallet balance
        referrer.walletBalance = (referrer.walletBalance || 0) + referralBonusAmount;
        user.walletBalance = (user.walletBalance || 0) + referralBonusAmount;
        await referrer.save();
        
        // Create transaction for referrer
        await Transaction.create({ 
          userType: 'female', 
          userId: referrer._id, 
          operationType: 'wallet', 
          action: 'credit', 
          amount: referralBonusAmount, 
          message: `Referral bonus for inviting ${user.email}`, 
          balanceAfter: referrer.walletBalance, 
          createdBy: referrer._id 
        });
        
        // Create transaction for referred user
        await Transaction.create({ 
          userType: 'female', 
          userId: user._id, 
          operationType: 'wallet', 
          action: 'credit', 
          amount: referralBonusAmount, 
          message: `Referral signup bonus using referral code`, 
          balanceAfter: user.walletBalance, 
          createdBy: user._id 
        });
      }
    } else if (user.referredByAgency) {
      // Female user referred by an agency
      referralBonusAmount = adminConfig.agencyReferralBonus || 100;
      const AgencyModel = require('../../models/agency/AgencyUser');
      referrer = await AgencyModel.findById(user.referredByAgency);
      
      if (referrer) {
        // Add referral bonus to both agency and referred user's wallet balance
        referrer.walletBalance = (referrer.walletBalance || 0) + referralBonusAmount;
        user.walletBalance = (user.walletBalance || 0) + referralBonusAmount;
        await referrer.save();
        
        // Create transaction for agency
        await Transaction.create({ 
          userType: 'agency', 
          userId: referrer._id, 
          operationType: 'wallet', 
          action: 'credit', 
          amount: referralBonusAmount, 
          message: `Agency referral bonus for inviting ${user.email}`, 
          balanceAfter: referrer.walletBalance, 
          createdBy: referrer._id 
        });
        
        // Create transaction for referred user
        await Transaction.create({ 
          userType: 'female', 
          userId: user._id, 
          operationType: 'wallet', 
          action: 'credit', 
          amount: referralBonusAmount, 
          message: `Referral signup bonus via agency`, 
          balanceAfter: user.walletBalance, 
          createdBy: user._id 
        });
      }
    } else {
      // No referral - return early
      return false;
    }
    
    // Mark referral bonus as awarded
    user.referralBonusAwarded = true;
    await user.save();
    
    return true; // Successfully awarded referral bonus
  } catch (error) {
    console.error('Error awarding referral bonus:', error);
    return false; // Error occurred
  }
};

// Update user interests
exports.updateInterests = async (req, res) => {
  try {
    const { interestIds } = req.body;
    const userId = req.user._id;

    if (!interestIds || !Array.isArray(interestIds)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.INTEREST_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { interests: interestIds },
      { new: true }
    ).populate('interests', 'title');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: messages.FEMALE_USER.INTERESTS_UPDATED_SUCCESS,
      data: {
        interests: user.interests
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user languages
exports.updateLanguages = async (req, res) => {
  try {
    const { languageIds } = req.body;
    const userId = req.user._id;

    if (!languageIds || !Array.isArray(languageIds)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.LANGUAGE_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { languages: languageIds },
      { new: true }
    ).populate('languages', 'title');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: messages.FEMALE_USER.LANGUAGES_UPDATED_SUCCESS,
      data: {
        languages: user.languages
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user hobbies
exports.updateHobbies = async (req, res) => {
  try {
    const { hobbies } = req.body;
    const userId = req.user._id;

    if (!hobbies || !Array.isArray(hobbies)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.HOBBIES_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { hobbies: hobbies },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: messages.FEMALE_USER.HOBBIES_UPDATED_SUCCESS,
      data: {
        hobbies: user.hobbies
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user sports
exports.updateSports = async (req, res) => {
  try {
    const { sports } = req.body;
    const userId = req.user._id;

    if (!sports || !Array.isArray(sports)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.SPORTS_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { sports: sports },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: messages.FEMALE_USER.SPORTS_UPDATED_SUCCESS,
      data: {
        sports: user.sports
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user film preferences
exports.updateFilm = async (req, res) => {
  try {
    const { film } = req.body;
    const userId = req.user._id;

    if (!film || !Array.isArray(film)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.FILM_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { film: film },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: messages.FEMALE_USER.FILM_UPDATED_SUCCESS,
      data: {
        film: user.film
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user music preferences
exports.updateMusic = async (req, res) => {
  try {
    const { music } = req.body;
    const userId = req.user._id;

    if (!music || !Array.isArray(music)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.MUSIC_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { music: music },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: "Music preferences updated successfully",
      data: {
        music: user.music
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user travel preferences
exports.updateTravel = async (req, res) => {
  try {
    const { travel } = req.body;
    const userId = req.user._id;

    if (!travel || !Array.isArray(travel)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.TRAVEL_REQUIRED
      });
    }

    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { travel: travel },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    return res.json({
      success: true,
      message: messages.FEMALE_USER.TRAVEL_UPDATED_SUCCESS,
      data: {
        travel: user.travel
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// User Registration (Email and Mobile Number) - ONLY ONCE PER USER
exports.registerUser = async (req, res) => {
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

    // ⚠️ Check if user already exists
    const existingUser = await FemaleUser.findOne({ $or: [{ email }, { mobileNumber }] });
    
    if (existingUser) {
      // If user exists but is not verified, allow re-registration
      if (!existingUser.isVerified || !existingUser.isActive) {
        // Update existing user with new OTP and referral info
        const otp = Math.floor(1000 + Math.random() * 9000);
        existingUser.otp = otp;
        existingUser.isVerified = false;
        existingUser.isActive = false;
        existingUser.profileCompleted = false;
        existingUser.reviewStatus = 'completeProfile';
        
        // Handle referral code if provided
        if (referralCode) {
          const referredByUser = await FemaleUser.findOne({ referralCode });
          const referredByAgency = await AgencyUser.findOne({ referralCode });
          if (referredByUser) {
            existingUser.referredByFemale = [referredByUser._id];
            existingUser.referredByAgency = undefined; // Clear agency referral if female referral is used
          } else if (referredByAgency) {
            existingUser.referredByAgency = referredByAgency._id;
            existingUser.referredByFemale = []; // Clear female referral if agency referral is used
            // Also update agency's referred female users list
            await AgencyUser.findByIdAndUpdate(
              referredByAgency._id,
              { $addToSet: { referredFemaleUsers: existingUser._id } }
            );
          }
        } else {
          // No referral code provided - clear both referral fields
          existingUser.referredByFemale = [];
          // Use $unset to properly remove the field instead of setting to undefined
          delete existingUser.referredByAgency;
        }
        
        await existingUser.save();
        // await sendOtp(email, otp); // ⛔ TEMPORARILY DISABLED (TESTING)
        
        // Trigger notification for account approval request
        await notificationService.handleEvent(notificationEvents.ACCOUNT_APPROVAL_REQUEST, {
          entityId: existingUser._id.toString(),
          entityType: 'female',
          email: existingUser.email,
          mobileNumber: existingUser.mobileNumber
        });
        
        return res.status(201).json({
          success: true,
          message: messages.AUTH.OTP_SENT_EMAIL,
          referralCode: existingUser.referralCode,
          otp: otp // For testing purposes
        });
      } else {
        // User is already verified and active - REJECT signup
        return res.status(400).json({ 
          success: false, 
          message: messages.AUTH.USER_ALREADY_EXISTS_LOGIN,
          redirectTo: 'LOGIN'
        });
      }
    }

    // Generate unique referral code for new user
    const generateReferralCode = require('../../utils/generateReferralCode');
    let myReferral = generateReferralCode();
    while (await FemaleUser.findOne({ referralCode: myReferral })) {
      myReferral = generateReferralCode();
    }

    // Link referral if provided: can be a FemaleUser or AgencyUser code
    let referredByFemale = null;
    let referredByAgency = null;
    if (referralCode) {
      const FemaleModel = require('../../models/femaleUser/FemaleUser');
      const AgencyModel = require('../../models/agency/AgencyUser');
      referredByFemale = await FemaleModel.findOne({ referralCode });
      if (!referredByFemale) {
        referredByAgency = await AgencyModel.findOne({ referralCode });
      }
    }

    // Create new user with initial state
    const userData = { 
      email, 
      mobileNumber, 
      otp, 
      referralCode: myReferral, 
      referredByFemale: referredByFemale ? [referredByFemale._id] : [], 
      isVerified: false,      // Will be true after OTP verification
      isActive: false,        // Will be true after OTP verification
      profileCompleted: false, // Will be true after profile completion
      reviewStatus: 'completeProfile' // Initial state
    };
    
    // Only add referredByAgency if it exists (avoid setting undefined/null)
    if (referredByAgency) {
      userData.referredByAgency = referredByAgency._id;
    }
    
    const newUser = new FemaleUser(userData);
    await newUser.save();
    
    // Update agency's referred female users list if referral was used
    if (referredByAgency) {
      await AgencyUser.findByIdAndUpdate(
        referredByAgency._id,
        { $addToSet: { referredFemaleUsers: newUser._id } }
      );
    }
    
    // await sendOtp(email, otp); // ⛔ TEMP OTP EMAIL DISABLED
    
    // Trigger notification for account approval request
    await notificationService.handleEvent(notificationEvents.ACCOUNT_APPROVAL_REQUEST, {
      entityId: newUser._id.toString(),
      entityType: 'female',
      email: newUser.email,
      mobileNumber: newUser.mobileNumber
    });

    res.status(201).json({
      success: true,
      message: messages.AUTH.OTP_SENT_EMAIL,
      otp: otp // For testing purposes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Login Female User (Send OTP) - ALWAYS ALLOWED AFTER OTP VERIFICATION
exports.loginUser = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    // Check if the user exists
    const user = await FemaleUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Check if user is verified (OTP verified during signup)
    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: messages.AUTH.ACCOUNT_NOT_VERIFIED });
    }
    
    // Check if user is active
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: messages.AUTH.ACCOUNT_DEACTIVATED });
    }

    // Generate new OTP for login
    const otp = Math.floor(1000 + Math.random() * 9000);
    user.otp = otp;
    await user.save();

    // Send OTP via email
    // await sendOtp(email, otp); // ⛔ TEMP OTP EMAIL DISABLED

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
const { updateConsecutiveActiveDays } = require('../../utils/updateConsecutiveActiveDays');
const { applyDailyLoginReward } = require('../../services/realtimeRewardService');

exports.verifyLoginOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const user = await FemaleUser.findOne({ otp, isVerified: true });
    
    if (user) {
      // Clear OTP after successful login
      user.otp = undefined;
      
      // Update consecutive active days ON FIRST LOGIN OF THE DAY
      // This ensures weekly consistency tracking works correctly
      await updateConsecutiveActiveDays(user._id);
      
      await user.save();
      
      // ✅ APPLY REAL-TIME DAILY LOGIN REWARD
      await applyDailyLoginReward(user._id);

      // Generate JWT token
      const token = generateToken(user._id, 'female');

      // Determine redirect based on reviewStatus
      let redirectTo = 'COMPLETE_PROFILE'; // default
      
      if (user.reviewStatus === 'completeProfile') {
        redirectTo = 'COMPLETE_PROFILE';
      } else if (user.reviewStatus === 'pending') {
        redirectTo = 'UNDER_REVIEW';
      } else if (user.reviewStatus === 'accepted') {
        redirectTo = 'DASHBOARD';
      } else if (user.reviewStatus === 'rejected') {
        redirectTo = 'REJECTED';
      }

      res.json({
        success: true,
        message: messages.AUTH.LOGIN_SUCCESS,
        token,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            profileCompleted: user.profileCompleted,
            reviewStatus: user.reviewStatus
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
exports.verifyOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const user = await FemaleUser.findOne({ otp, isVerified: false });

    if (user) {
      const token = generateToken(user._id, 'female');
      
      // After OTP verification:
      user.isVerified = true;  // Mark as verified
      user.isActive = true;    // Mark as active
      user.otp = undefined;    // Clear OTP
      user.reviewStatus = 'completeProfile'; // Ensure status is completeProfile
      // profileCompleted remains false until profile is completed

      await user.save();
      
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

// Add Extra Information (Name, Age, Gender, etc.)
exports.addUserInfo = async (req, res) => {
  const { name, age, gender, bio, videoUrl, interests, languages, hobbies, sports, film, music, travel } = req.body; // images is managed via upload endpoint
  try {
    const user = await FemaleUser.findById(req.user.id);
    user.name = name;
    user.age = age;
    user.gender = gender;
    user.bio = bio;
    user.videoUrl = videoUrl;
    user.interests = interests;
    user.languages = languages;
    if (hobbies) user.hobbies = hobbies;
    if (sports) user.sports = sports;
    if (film) user.film = film;
    if (music) user.music = music;
    if (travel) user.travel = travel;
    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Complete user profile after OTP verification - UNIFIED API (accepts multipart form-data)
// Accepts: images (multipart), video (multipart), profile details (form fields)
exports.completeUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Early validation for required fields to prevent hanging requests
    if (!req.body.name || !req.body.age || !req.body.gender || !req.body.bio) {
      return res.status(400).json({ 
        success: false, 
        message: messages.REGISTRATION.PROFILE_REQUIRED_FIELDS
      });
    }
    
    // Helper function to parse string values that might be JSON-encoded
    const parseValue = (value) => {
      if (typeof value === 'string') {
        // Remove quotes if present
        const trimmed = value.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        // Try to parse as JSON array/object
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
    
    // Safe array parsing function to prevent crashes
    const safeParseArray = (value) => {
      if (!value) return [];

      if (Array.isArray(value)) return value;

      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          console.error('JSON parse failed:', value);
          return [];
        }
      }

      return [];
    };
    
    // Parse and sanitize incoming data
    const name = parseValue(req.body.name);
    const age = parseValue(req.body.age);
    const gender = parseValue(req.body.gender);
    const bio = parseValue(req.body.bio);
    const interests = safeParseArray(req.body.interests);
    const languages = safeParseArray(req.body.languages);
    const hobbies = safeParseArray(req.body.hobbies);
    const sports = safeParseArray(req.body.sports);
    const film = safeParseArray(req.body.film);
    const music = safeParseArray(req.body.music);
    const travel = safeParseArray(req.body.travel);
    
    // Comprehensive debug logging
    console.log('=== COMPLETE PROFILE DEBUG ===');
    console.log('REQ OBJECT EXISTS:', typeof req);
    console.log('REQ.FILES:', req.files);
    console.log('REQ.BODY:', req.body);
    console.log('MULTER HANDLED FILES CORRECTLY?:', req.files !== undefined);
    console.log('IMAGES FIELD EXISTS:', req.files && req.files.images ? 'YES' : 'NO', 'Value:', req.files?.images);
    console.log('VIDEO FIELD EXISTS:', req.files && req.files.video ? 'YES' : 'NO', 'Value:', req.files?.video);
    console.log('RAW INTERESTS:', req.body.interests, 'TYPE:', typeof req.body.interests);
    console.log('PARSED INTERESTS:', interests, 'TYPE:', typeof interests, 'IS_ARRAY:', Array.isArray(interests));
    console.log('RAW LANGUAGES:', req.body.languages, 'TYPE:', typeof req.body.languages);
    console.log('PARSED LANGUAGES:', languages, 'TYPE:', typeof languages, 'IS_ARRAY:', Array.isArray(languages));
    console.log('=============================');
    
    // Find the user with timeout handling
    let user;
    try {
      // Set a timeout for the database operation to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 10000); // 10 second timeout
      });
      
      const userPromise = FemaleUser.findById(userId);
      user = await Promise.race([userPromise, timeoutPromise]);
      
      if (!user) {
        return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
      }

      // Check if profile is already completed
      if (user.profileCompleted) {
        return res.status(400).json({ 
          success: false, 
          message: messages.REGISTRATION.PROFILE_COMPLETED
        });
      }
    } catch (dbErr) {
      console.error('Database error in completeUserProfile:', dbErr);
      return res.status(500).json({ 
        success: false, 
        error: 'Database operation timed out or failed',
        message: 'Unable to process profile completion, please try again later.'
      });
    }

    // Validate required fields for profile completion
    if (!name || !age || !gender || !bio) {
      return res.status(400).json({ 
        success: false, 
        message: messages.REGISTRATION.PROFILE_REQUIRED_FIELDS
      });
    }

    // Handle image uploads from multipart request with safety checks
    const uploadedImages =
      req.files && Array.isArray(req.files.images)
        ? req.files.images
        : [];
    const uploadedVideo =
      req.files && Array.isArray(req.files.video)
        ? req.files.video[0]
        : null;
    
    // Check if images provided (either in request or already uploaded)
    const hasImages = uploadedImages.length > 0 || (user.images && user.images.length > 0);
    // Temporarily comment out for debug - uncomment when multer works
    // if (!hasImages) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: messages.REGISTRATION.PROFILE_MIN_IMAGES
    //   });
    // }

    // Check if video provided (either in request or already uploaded)
    const hasVideo = uploadedVideo || user.videoUrl;
    // Temporarily comment out for debug - uncomment when multer works
    // if (!hasVideo) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: messages.REGISTRATION.PROFILE_VIDEO_REQUIRED
    //   });
    // }



    // Process uploaded images (if provided in this request)
    if (uploadedImages.length > 0) {
      const currentCount = Array.isArray(user.images) ? user.images.length : 0;
      const remainingSlots = Math.max(0, 5 - currentCount);
      const filesToProcess = uploadedImages.slice(0, remainingSlots);
      
      const uploadToCloudinary = require('../../utils/cloudinaryUpload');
      const createdImageIds = [];
      for (const f of filesToProcess) {
        try {
          const result = await uploadToCloudinary(f.buffer, 'admin_uploads', 'image');
          const imageUrl = result.secure_url;
          if (imageUrl) {
            const newImage = await FemaleImage.create({ femaleUserId: userId, imageUrl: imageUrl });
            createdImageIds.push(newImage._id);
          }
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
          return res.status(500).json({ success: false, message: 'Failed to upload image to Cloudinary', error: uploadErr.message });
        }
      }
      
      user.images = [...(user.images || []), ...createdImageIds];
    }

    // Process uploaded video (if provided in this request)
    if (uploadedVideo) {
      const uploadToCloudinary = require('../../utils/cloudinaryUpload');
      try {
        const result = await uploadToCloudinary(uploadedVideo.buffer, 'female_videos', 'video');
        user.videoUrl = result.secure_url;
      } catch (uploadErr) {
        console.error('Video upload error:', uploadErr);
        return res.status(500).json({ success: false, message: 'Failed to upload video to Cloudinary', error: uploadErr.message });
      }
    }

    // Update user profile
    user.name = name;
    user.age = Number(age);
    user.gender = gender;
    user.bio = bio;
    
    // Arrays - only update if provided and validate ObjectIds
    if (interests && Array.isArray(interests) && interests.length > 0) {
      console.log('✅ Setting interests:', interests);
      try {
        // Validate that these interest IDs exist
        const Interest = require('../../models/admin/Interest');
        const validInterests = await Interest.find({ _id: { $in: interests } });
        console.log('Valid interests found:', validInterests.length, 'out of', interests.length);
        user.interests = validInterests.map(i => i._id);
      } catch (interestErr) {
        console.error('Error validating interests:', interestErr);
        // Continue without setting interests if validation fails
        user.interests = [];
      }
    } else {
      console.log('❌ Not setting interests. Value:', interests, 'IsArray:', Array.isArray(interests), 'Length:', interests?.length);
    }
    
    if (languages && Array.isArray(languages) && languages.length > 0) {
      console.log('✅ Setting languages:', languages);
      try {
        // Validate that these language IDs exist
        const Language = require('../../models/admin/Language');
        const validLanguages = await Language.find({ _id: { $in: languages } });
        console.log('Valid languages found:', validLanguages.length, 'out of', languages.length);
        user.languages = validLanguages.map(l => l._id);
      } catch (languageErr) {
        console.error('Error validating languages:', languageErr);
        // Continue without setting languages if validation fails
        user.languages = [];
      }
    } else {
      console.log('❌ Not setting languages. Value:', languages, 'IsArray:', Array.isArray(languages), 'Length:', languages?.length);
    }
    
    // Import crypto once at the top to avoid repeated imports
    const crypto = require('crypto');
    
    if (hobbies && Array.isArray(hobbies) && hobbies.length > 0) {
      user.hobbies = hobbies.map(item => {
        if (typeof item === 'object' && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        const id = crypto.randomBytes(8).toString('hex');
        const name = item.name || item;
        return { id, name };
      });
    }
    if (sports && Array.isArray(sports) && sports.length > 0) {
      user.sports = sports.map(item => {
        if (typeof item === 'object' && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        const id = crypto.randomBytes(8).toString('hex');
        const name = item.name || item;
        return { id, name };
      });
    }
    if (film && Array.isArray(film) && film.length > 0) {
      user.film = film.map(item => {
        if (typeof item === 'object' && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        const id = crypto.randomBytes(8).toString('hex');
        const name = item.name || item;
        return { id, name };
      });
    }
    if (music && Array.isArray(music) && music.length > 0) {
      user.music = music.map(item => {
        if (typeof item === 'object' && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        const id = crypto.randomBytes(8).toString('hex');
        const name = item.name || item;
        return { id, name };
      });
    }
    if (travel && Array.isArray(travel) && travel.length > 0) {
      user.travel = travel.map(item => {
        if (typeof item === 'object' && item.id && item.name) {
          return { id: item.id, name: item.name };
        }
        const id = crypto.randomBytes(8).toString('hex');
        const name = item.name || item;
        return { id, name };
      });
    }
    
    console.log('📝 User before save - interests:', user.interests, 'languages:', user.languages);
    
    // 🔑 KEY STATE CHANGES:
    user.profileCompleted = true;      // Profile is now complete
    user.reviewStatus = 'pending';     // Set to pending for admin review

    // Save user with timeout to prevent hanging
    try {
      const savePromise = user.save();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Save operation timeout')), 15000); // 15 second timeout
      });
      
      await Promise.race([savePromise, timeoutPromise]);
    } catch (saveErr) {
      console.error('Error saving user:', saveErr);
      return res.status(500).json({ 
        success: false, 
        error: 'Save operation failed or timed out',
        message: 'Unable to save profile completion, please try again later.'
      });
    }
    
    res.json({ 
      success: true, 
      message: messages.REGISTRATION.PROFILE_COMPLETED_SUCCESS,
      data: {
        profileCompleted: true,
        reviewStatus: 'pending',
        redirectTo: 'UNDER_REVIEW',
        uploadedImages: uploadedImages.length,
        uploadedVideo: !!uploadedVideo
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Utility function to clean up invalid interests and languages references
const cleanUpUserReferences = async (userId) => {
  try {
    const FemaleUser = require('../../models/femaleUser/FemaleUser');
    const Interest = require('../../models/admin/Interest');
    const Language = require('../../models/admin/Language');
    
    const user = await FemaleUser.findById(userId);
    if (!user) return null;
    
    let updateNeeded = false;
    let updatedInterests = [];
    let updatedLanguages = [];
    
    // Check and clean up interests
    if (user.interests && user.interests.length > 0) {
      const validInterests = await Interest.find({ 
        _id: { $in: user.interests } 
      });
      updatedInterests = validInterests.map(i => i._id);
      if (updatedInterests.length !== user.interests.length) {
        updateNeeded = true;
      }
    }
    
    // Check and clean up languages
    if (user.languages && user.languages.length > 0) {
      const validLanguages = await Language.find({ 
        _id: { $in: user.languages } 
      });
      updatedLanguages = validLanguages.map(l => l._id);
      if (updatedLanguages.length !== user.languages.length) {
        updateNeeded = true;
      }
    }
    
    // Update user if there are invalid references
    if (updateNeeded) {
      await FemaleUser.findByIdAndUpdate(userId, {
        interests: updatedInterests,
        languages: updatedLanguages
      });
      console.log(`Cleaned up references for user ${userId}`);
    }
    
    return {
      originalInterestsCount: user.interests ? user.interests.length : 0,
      validInterestsCount: updatedInterests.length,
      originalLanguagesCount: user.languages ? user.languages.length : 0,
      validLanguagesCount: updatedLanguages.length,
      cleaned: updateNeeded
    };
  } catch (error) {
    console.error('Error cleaning up user references:', error);
    return null;
  }
};

// Get Female User Profile
exports.getUserProfile = async (req, res) => {
  try {
    // Clean up invalid references first
    await cleanUpUserReferences(req.user.id);
    
    const user = await FemaleUser.findById(req.user.id)
      .select('-otp')
      .populate({
        path: 'images',
        select: 'femaleUserId imageUrl createdAt updatedAt'
      })
      .populate({
        path: 'interests',
        select: 'title _id status'
      })
      .populate({
        path: 'languages',
        select: 'title _id status'
      })
      .populate({
        path: 'favourites',
        select: 'firstName lastName email'
      });
      
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update User Info
exports.updateUserInfo = async (req, res) => {
  try {
    const user = await FemaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Helper function to parse form-data values (handles JSON strings)
    const parseFormValue = (value) => {
      if (!value) return value;
      if (typeof value === 'string') {
        // Remove surrounding quotes if present
        const trimmed = value.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        // Try to parse as JSON array/object
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            console.error('Failed to parse JSON:', trimmed, e);
            return value;
          }
        }
        return value;
      }
      return value;
    };

    // Parse all incoming values
    const name = parseFormValue(req.body.name);
    const age = parseFormValue(req.body.age);
    const gender = parseFormValue(req.body.gender);
    const bio = parseFormValue(req.body.bio);
    const videoUrl = parseFormValue(req.body.videoUrl);
    const interests = parseFormValue(req.body.interests);
    const languages = parseFormValue(req.body.languages);
    const hobbies = parseFormValue(req.body.hobbies);
    const sports = parseFormValue(req.body.sports);
    const film = parseFormValue(req.body.film);
    const music = parseFormValue(req.body.music);
    const travel = parseFormValue(req.body.travel);
    const coinsPerMinute = parseFormValue(req.body.coinsPerMinute);

    console.log('📥 Parsed values:', { name, age, bio, travel, hobbies, sports, film, music });

    // Update basic fields
    if (name) user.name = name;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (bio) user.bio = bio;
    if (videoUrl) user.videoUrl = videoUrl;
    
    // Update interests if provided and validate
    if (interests) {
      const Interest = require('../../models/admin/Interest');
      const interestArray = Array.isArray(interests) ? interests : [interests];
      const validInterests = await Interest.find({ _id: { $in: interestArray } });
      user.interests = validInterests.map(i => i._id);
    }
    
    // Update languages if provided and validate
    if (languages) {
      const Language = require('../../models/admin/Language');
      const languageArray = Array.isArray(languages) ? languages : [languages];
      const validLanguages = await Language.find({ _id: { $in: languageArray } });
      user.languages = validLanguages.map(l => l._id);
    }
    
    // Helper to process preference arrays
    const processPreferenceArray = (items, fieldName) => {
      if (!items || !Array.isArray(items) || items.length === 0) return null;
      
      console.log(`Processing ${fieldName}:`, items);
      
      try {
        const processed = items.map((item, index) => {
          console.log(`  Item ${index}:`, item, 'Type:', typeof item);
          
          if (!item) {
            console.log(`  Skipping null/undefined item at index ${index}`);
            return null;
          }
          
          if (typeof item === 'object' && item !== null) {
            if (item.id && item.name) {
              return { id: item.id, name: item.name };
            }
            console.warn(`  Item ${index} missing id or name:`, item);
            return null;
          }
          
          // Handle string or primitive
          const id = require('crypto').randomBytes(8).toString('hex');
          const name = String(item);
          return { id, name };
        }).filter(Boolean);
        
        console.log(`  Processed ${fieldName}:`, processed);
        return processed;
      } catch (err) {
        console.error(`Error processing ${fieldName}:`, err);
        throw err;
      }
    };
    
    // Update preferences - REPLACE existing arrays with new data
    if (hobbies !== undefined) {  // Changed from 'if (hobbies)' to handle empty arrays
      if (Array.isArray(hobbies) && hobbies.length === 0) {
        // Clear the array if empty array is sent
        user.hobbies = [];
      } else {
        const newHobbies = processPreferenceArray(hobbies, 'hobbies');
        if (newHobbies && newHobbies.length > 0) {
          const existingIds = (user.hobbies || []).map(h => h.id);
          const uniqueNew = newHobbies.filter(h => !existingIds.includes(h.id));
          user.hobbies = [...(user.hobbies || []), ...uniqueNew];
        }
      }
    }
    
    if (sports !== undefined) {  // Changed from 'if (sports)' to handle empty arrays
      if (Array.isArray(sports) && sports.length === 0) {
        // Clear the array if empty array is sent
        user.sports = [];
      } else {
        const newSports = processPreferenceArray(sports, 'sports');
        if (newSports && newSports.length > 0) {
          const existingIds = (user.sports || []).map(s => s.id);
          const uniqueNew = newSports.filter(s => !existingIds.includes(s.id));
          user.sports = [...(user.sports || []), ...uniqueNew];
        }
      }
    }
    
    if (film !== undefined) {  // Changed from 'if (film)' to handle empty arrays
      if (Array.isArray(film) && film.length === 0) {
        // Clear the array if empty array is sent
        user.film = [];
      } else {
        const newFilm = processPreferenceArray(film, 'film');
        if (newFilm && newFilm.length > 0) {
          const existingIds = (user.film || []).map(f => f.id);
          const uniqueNew = newFilm.filter(f => !existingIds.includes(f.id));
          user.film = [...(user.film || []), ...uniqueNew];
        }
      }
    }
    
    if (music !== undefined) {  // Changed from 'if (music)' to handle empty arrays
      if (Array.isArray(music) && music.length === 0) {
        // Clear the array if empty array is sent
        user.music = [];
      } else {
        const newMusic = processPreferenceArray(music, 'music');
        if (newMusic && newMusic.length > 0) {
          const existingIds = (user.music || []).map(m => m.id);
          const uniqueNew = newMusic.filter(m => !existingIds.includes(m.id));
          user.music = [...(user.music || []), ...uniqueNew];
        }
      }
    }
    
    if (travel !== undefined) {  // Changed from 'if (travel)' to handle empty arrays
      if (Array.isArray(travel) && travel.length === 0) {
        // Clear the array if empty array is sent
        user.travel = [];
      } else {
        const newTravel = processPreferenceArray(travel, 'travel');
        if (newTravel && newTravel.length > 0) {
          const existingIds = (user.travel || []).map(t => t.id);
          const uniqueNew = newTravel.filter(t => !existingIds.includes(t.id));
          user.travel = [...(user.travel || []), ...uniqueNew];
        }
      }
    }
    
    // Update coinsPerMinute if provided and validate
    if (coinsPerMinute !== undefined) {
      const rate = Number(coinsPerMinute);
      if (!isNaN(rate) && rate >= 0) {
        user.coinsPerMinute = rate;
      }
    }
    

    
    await user.save();
    
    // Return updated user with populated fields
    const updatedUser = await FemaleUser.findById(user._id)
      .populate('interests', 'title')
      .populate('languages', 'title');
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: updatedUser 
    });
  } catch (err) {
    console.error('❌ Error in updateUserInfo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Female User Account
exports.deleteUser = async (req, res) => {
  try {
    await FemaleUser.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: messages.USER.USER_DELETED });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get balance information for female user
exports.getBalanceInfo = async (req, res) => {
  try {
    const user = await FemaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    // Get admin config for conversion rate
    const adminConfig = await AdminConfig.getConfig();
    
    // Validate required financial settings are configured
    if (adminConfig.coinToRupeeConversionRate === undefined || adminConfig.coinToRupeeConversionRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Coin to rupee conversion rate not configured by admin'
      });
    }
    
    const coinToRupeeRate = adminConfig.coinToRupeeConversionRate;
    
    const walletBalance = user.walletBalance || 0;
    const coinBalance = user.coinBalance || 0;
    
    // If 5 coins = 1 rupee, then conversion rate is 1/5 = 0.2
    const conversionRate = coinToRupeeRate ? (1 / coinToRupeeRate) : 0.2;
    
    const walletBalanceInRupees = Number((walletBalance * conversionRate).toFixed(2));
    const coinBalanceInRupees = Number((coinBalance * conversionRate).toFixed(2));
    
    return res.json({
      success: true,
      data: {
        walletBalance: {
          coins: walletBalance,
          rupees: walletBalanceInRupees
        },
        conversionRate: {
          coinsPerRupee: coinToRupeeRate,
          rupeesPerCoin: conversionRate
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get withdrawal history for female user
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({ 
      userType: 'female', 
      userId: req.user.id 
    }).sort({ createdAt: -1 });
    
    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Upload Images (for profile completion or later updates)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: messages.IMAGE.NO_IMAGES });
    }

    const user = await FemaleUser.findById(req.user.id).populate('images');
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    const currentCount = Array.isArray(user.images) ? user.images.length : 0;
    const remainingSlots = Math.max(0, 5 - currentCount);
    
    if (remainingSlots === 0) {
      return res.status(400).json({ 
        success: false, 
        message: messages.REGISTRATION.IMAGE_LIMIT_REACHED 
      });
    }

    const filesToProcess = req.files.slice(0, remainingSlots);
    const skipped = req.files.length - filesToProcess.length;
     
    const uploadToCloudinary = require('../../utils/cloudinaryUpload');
    const createdImageIds = [];
    for (const f of filesToProcess) {
      try {
        const result = await uploadToCloudinary(f.buffer, 'admin_uploads', 'image');
        const imageUrl = result.secure_url;
        if (imageUrl) {
          const newImage = await FemaleImage.create({ 
            femaleUserId: req.user.id, 
            imageUrl: imageUrl 
          });
          createdImageIds.push(newImage._id);
        }
      } catch (uploadErr) {
        console.error('Image upload error:', uploadErr);
        return res.status(500).json({ success: false, message: 'Failed to upload image to Cloudinary', error: uploadErr.message });
      }
    }

    user.images = [...(user.images || []).map(img => img._id ? img._id : img), ...createdImageIds];
    await user.save();

    // Populate and return
    const updatedUser = await FemaleUser.findById(user._id).populate('images');

    return res.json({ 
      success: true, 
      message: messages.IMAGE.IMAGE_UPLOAD_SUCCESS, 
      data: {
        added: createdImageIds.length, 
        skipped: skipped,
        totalImages: updatedUser.images.length,
        images: updatedUser.images
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Upload Video (for profile completion or later updates)
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: messages.NOTIFICATION.NO_VIDEO_UPLOADED 
      });
    }

    const uploadToCloudinary = require('../../utils/cloudinaryUpload');
    
    let result;
    try {
      result = await uploadToCloudinary(req.file.buffer, 'female_videos', 'video');
    } catch (uploadErr) {
      console.error('Video upload error:', uploadErr);
      return res.status(500).json({ success: false, message: 'Failed to upload video to Cloudinary', error: uploadErr.message });
    }
    
    const videoUrl = result.secure_url;
    const publicId = result.public_id;
    const resourceType = result.resource_type || 'video';
    const duration = result.duration;
    const bytes = result.bytes;
    
    const user = await FemaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Store old video URL for potential cleanup
    const oldVideoUrl = user.videoUrl;
    
    // Update with new video
    user.videoUrl = videoUrl;
    await user.save();

    res.json({ 
      success: true,
      message: messages.NOTIFICATION.VIDEO_UPLOADED_SUCCESS,
      data: {
        url: videoUrl,
        secureUrl: videoUrl,
        publicId,
        resourceType,
        duration,
        bytes,
        replacedOldVideo: !!oldVideoUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete an image by image id (owned by the authenticated female user)
exports.deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const imageDoc = await FemaleImage.findById(imageId);
    if (!imageDoc) {
      return res.status(404).json({ 
        success: false, 
        message: messages.USER.IMAGE_NOT_FOUND 
      });
    }
    
    if (String(imageDoc.femaleUserId) !== String(req.user.id)) {
      return res.status(403).json({ 
        success: false, 
        message: messages.USER.NOT_AUTHORIZED_DELETE_IMAGE 
      });
    }

    // Remove ref from user.images and delete image document
    await FemaleUser.updateOne(
      { _id: req.user.id }, 
      { $pull: { images: imageDoc._id } }
    );
    await FemaleImage.deleteOne({ _id: imageDoc._id });
    
    // Get updated user with remaining images
    const user = await FemaleUser.findById(req.user.id).populate('images');

    return res.json({ 
      success: true, 
      message: messages.IMAGE.IMAGE_DELETED,
      data: {
        deletedImageId: imageId,
        remainingImages: user.images.length,
        images: user.images
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const user = await FemaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    if (!user.videoUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video to delete' 
      });
    }
    
    // Store video URL for potential Cloudinary cleanup
    const deletedVideoUrl = user.videoUrl;
    
    // Remove video URL
    user.videoUrl = null;
    await user.save();
    
    return res.json({ 
      success: true, 
      message: 'Video deleted successfully',
      data: {
        deletedVideoUrl,
        hasVideo: false
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete preference item (hobbies, sports, film, music, travel)
exports.deletePreferenceItem = async (req, res) => {
  try {
    const { type, itemId } = req.params; // type: hobbies|sports|film|music|travel
    
    const validTypes = ['hobbies', 'sports', 'film', 'music', 'travel'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }
    
    const user = await FemaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Remove item by MongoDB's _id (subdocument ID)
    const originalLength = (user[type] || []).length;
    user[type] = (user[type] || []).filter(item => String(item._id) !== String(itemId));
    
    if (user[type].length === originalLength) {
      return res.status(404).json({ 
        success: false, 
        message: `Item with _id ${itemId} not found in ${type}` 
      });
    }
    
    await user.save();
    
    return res.json({ 
      success: true, 
      message: `${type} item deleted successfully`,
      data: {
        type,
        deletedItemId: itemId,
        remaining: user[type]
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// List/browse male users for female users (paginated)
exports.listMaleUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Get list of users that the current female user has blocked
    const blockedByCurrentUser = await FemaleBlockList.find({ femaleUserId: req.user.id }).select('blockedUserId');
    const blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current female user
    const blockedByOthers = await MaleBlockList.find({ blockedUserId: req.user.id }).select('maleUserId');
    const blockedByOthersIds = blockedByOthers.map(block => block.maleUserId);

    const filter = { 
      status: 'active', 
      reviewStatus: 'accepted',
      _id: { 
        $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds] // Exclude users blocked by either party
      }
    };

    const [items, total] = await Promise.all([
      MaleUser.find(filter)
        .select('firstName lastName age bio profileImages')
        .skip(skip)
        .limit(limit)
        .lean(),
      MaleUser.countDocuments(filter)
    ]);

    const data = items.map((u) => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      age: u.age,
      bio: u.bio,
      avatarUrl: Array.isArray(u.profileImages) && u.profileImages.length > 0 ? u.profileImages[0] : null
    }));

    return res.json({ success: true, page, limit, total, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Cleanup incomplete profiles (can be run as a cron job or manually)
// Deletes profiles that are not completed within a specified time period
exports.cleanupIncompleteProfiles = async (req, res) => {
  try {
    // Delete profiles that are not completed and older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await FemaleUser.deleteMany({
      profileCompleted: false,
      createdAt: { $lt: sevenDaysAgo }
    });

    return res.json({ 
      success: true, 
      message: `Cleaned up ${result.deletedCount} incomplete profile(s)`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update review status and award referral bonus if applicable
exports.updateReviewStatus = async (req, res) => {
  try {
    const { userId, reviewStatus } = req.body;
    
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    const oldReviewStatus = user.reviewStatus;
    user.reviewStatus = reviewStatus;
    await user.save();
    
    // Note: Referral bonus is handled only in admin approval, not in user-side review status update
    
    return res.json({
      success: true,
      message: 'Review status updated successfully',
      data: {
        userId: user._id,
        reviewStatus: user.reviewStatus
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Toggle online status for female user
exports.toggleOnlineStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { onlineStatus, latitude, longitude } = req.body; // true for online, false for offline
    
    if (typeof onlineStatus !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'onlineStatus (boolean) is required in request body' 
      });
    }

    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // If going online
    if (onlineStatus) {
      // Location is required to go online
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Location is required to go online'
        });
      }
      
      // Set online start time
      user.onlineStartTime = new Date();
      user.onlineStatus = true;
      
      user.latitude = parseFloat(latitude);
      user.longitude = parseFloat(longitude);
      user.locationUpdatedAt = new Date();
    } 
    // If going offline
    else {
      // Calculate online duration and add to total
      if (user.onlineStartTime) {
        const endTime = new Date();
        const durationMinutes = (endTime - user.onlineStartTime) / (1000 * 60); // Convert ms to minutes
        user.totalOnlineMinutes = (user.totalOnlineMinutes || 0) + durationMinutes;
        user.onlineStartTime = null; // Reset start time
      }
      user.onlineStatus = false;
    }

    await user.save();

    return res.json({ 
      success: true, 
      message: messages.USER.STATUS_UPDATED(onlineStatus),
      data: {
        onlineStatus: user.onlineStatus,
        totalOnlineMinutes: user.totalOnlineMinutes || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Refresh location for female user when app opens/resumes
exports.locationRefresh = async (req, res) => {
  try {
    const userId = req.user._id;
    const { latitude, longitude } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'latitude and longitude are required in request body' 
      });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'latitude must be a number between -90 and 90'
      });
    }
    
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'longitude must be a number between -180 and 180'
      });
    }

    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Only update location if user is online
    if (!user.onlineStatus) {
      return res.json({ 
        success: true, 
        message: 'User is offline, location update ignored',
        data: {
          onlineStatus: user.onlineStatus
        }
      });
    }

    // Update location
    user.latitude = lat;
    user.longitude = lng;
    user.locationUpdatedAt = new Date();

    await user.save();

    return res.json({ 
      success: true, 
      message: 'Location updated successfully',
      data: {
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update female user profile details (excluding earning rate)
exports.updateProfileDetails = async (req, res) => {
  try {
    const { name, bio, age } = req.body;
    const userId = req.user._id;
    
    // Create update object with only provided fields
    const updateData = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    if (bio !== undefined) {
      updateData.bio = bio;
    }
    if (age !== undefined) {
      updateData.age = age;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update"
      });
    }
    
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-otp -password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }
    
    return res.json({
      success: true,
      message: "Profile details updated successfully",
      data: user
    });
  } catch (err) {
    console.error('❌ Error in updateProfileDetails:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update female user earning rate (coinsPerMinute) only
exports.updateEarningRate = async (req, res) => {
  try {
    const { coinsPerMinute } = req.body;
    const userId = req.user._id;
    
    // Validate coinsPerMinute is provided
    if (coinsPerMinute === undefined) {
      return res.status(400).json({
        success: false,
        message: "coinsPerMinute is required"
      });
    }
    
    // Validate coinsPerMinute is a positive number
    const rate = Number(coinsPerMinute);
    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({
        success: false,
        message: "coinsPerMinute must be a positive number"
      });
    }
    
    const updateData = { coinsPerMinute: rate };
    
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-otp -password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }
    
    return res.json({
      success: true,
      message: "Earning rate updated successfully",
      data: {
        coinsPerMinute: user.coinsPerMinute
      }
    });
  } catch (err) {
    console.error('❌ Error in updateEarningRate:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update female user location
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;
    
    // Validate latitude and longitude are provided
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required"
      });
    }
    
    // Validate latitude is within valid range (-90 to 90)
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be a number between -90 and 90"
      });
    }
    
    // Validate longitude is within valid range (-180 to 180)
    const lng = Number(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be a number between -180 and 180"
      });
    }
    
    const updateData = { 
      latitude: lat,
      longitude: lng
    };
    
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-otp -password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }
    
    return res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    console.error('❌ Error in updateLocation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete female user account permanently
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`Deleting female user account: ${userId}`);
    
    // Find the user first to get reference data
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete related chat rooms and messages
    const chatRooms = await ChatRoom.find({
      'participants.userId': userId
    });
    
    console.log(`Found ${chatRooms.length} chat rooms to delete`);
    
    // Delete messages from these rooms
    for (const room of chatRooms) {
      await Message.deleteMany({ chatRoomId: room._id });
    }
    
    // Delete the chat rooms themselves
    await ChatRoom.deleteMany({
      'participants.userId': userId
    });
    
    // Delete transactions
    const deletedTransactions = await Transaction.deleteMany({
      userId: userId
    });
    
    // Delete withdrawal requests
    const deletedWithdrawals = await WithdrawalRequest.deleteMany({
      userId: userId
    });
    
    // Delete user images
    await FemaleImage.deleteMany({
      userId: userId
    });
    
    // Finally, delete the user account
    await FemaleUser.findByIdAndDelete(userId);
    
    console.log(`Account deletion completed for user: ${userId}`);
    
    res.json({
      success: true,
      message: 'Account permanently deleted',
      data: {
        chatRoomsDeleted: chatRooms.length,
        messagesDeleted: 'All messages in user rooms',
        transactionsDeleted: deletedTransactions.deletedCount,
        withdrawalsDeleted: deletedWithdrawals.deletedCount,
        imagesDeleted: 'All user images'
      }
    });
    
  } catch (error) {
    console.error('Error deleting female user account:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};
