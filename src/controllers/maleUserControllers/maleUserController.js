const mongoose = require('mongoose');
const MaleUser = require('../../models/maleUser/MaleUser');
const Image = require('../../models/maleUser/Image');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleBlockList = require('../../models/maleUser/BlockList');
const FemaleBlockList = require('../../models/femaleUser/BlockList');
const MaleFollowing = require('../../models/maleUser/Following');
const FemaleFollowing = require('../../models/femaleUser/Following');
const Package = require('../../models/maleUser/Package');
const AdminConfig = require('../../models/admin/AdminConfig');
const generateToken = require('../../utils/generateToken');  // Utility function to generate JWT token
const generateReferralCode = require('../../utils/generateReferralCode');
const Transaction = require('../../models/common/Transaction');
const sendOtp = require('../../utils/sendOtp');  // Utility function to send OTP via email
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const notificationService = require('../../services/notificationService');
const notificationEvents = require('../../constants/notificationEvents');
const ChatRoom = require('../../models/chat/ChatRoom');
const Message = require('../../models/chat/Message');
const WithdrawalRequest = require('../../models/common/WithdrawalRequest');

// Update user interests
exports.updateInterests = async (req, res) => {
  try {
    // Parse interests from either body or form data
    const interests = parseFormValue(req.body.interests);
    const userId = req.user._id;

    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.INTEREST_REQUIRED
      });
    }

    // Parse interests in case it comes as string from form-data
    let parsedInterestIds = interests;
    if (typeof parsedInterestIds === 'string') {
      try {
        parsedInterestIds = JSON.parse(parsedInterestIds);
      } catch {
        return res.status(400).json({
          success: false,
          message: messages.PROFILE.INTEREST_REQUIRED
        });
      }
    }

    if (!parsedInterestIds || !Array.isArray(parsedInterestIds)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.INTEREST_REQUIRED
      });
    }

    // Validate that all IDs are valid ObjectIds
    const validIds = parsedInterestIds
      .map(id => mongoose.Types.ObjectId.isValid(id) ? id : null)
      .filter(Boolean);

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.INTEREST_REQUIRED
      });
    }

    // Validate that these ObjectIds exist in the Interest collection
    const Interest = require('../../models/admin/Interest');
    const validInterests = await Interest.find({ _id: { $in: validIds } });
    const validInterestIds = validInterests.map(i => i._id);

    // Get the existing user to preserve other data
    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    // Combine existing interests with new ones, avoiding duplicates
    // 🔒 Normalize + dedupe by string value
    const normalize = id => id.toString();

    const existingInterestIds = (existingUser.interests || []).map(normalize);
    const newInterestIds = validInterestIds.map(id => id.toString());

    // Merge + dedupe by value
    const merged = [...new Set([...existingInterestIds, ...newInterestIds])];

    // Convert back to ObjectId
    const allInterestIds = merged.map(id => new mongoose.Types.ObjectId(id));

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { interests: allInterestIds },
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
      message: "Interests updated successfully",
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
    const languages = parseFormValue(req.body.languages);
    const userId = req.user._id;

    if (!Array.isArray(languages)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.LANGUAGE_REQUIRED
      });
    }

    let parsedLanguageIds = languages;
    if (typeof parsedLanguageIds === 'string') {
      try {
        parsedLanguageIds = JSON.parse(parsedLanguageIds);
      } catch {
        return res.status(400).json({
          success: false,
          message: messages.PROFILE.LANGUAGE_REQUIRED
        });
      }
    }

    const validIds = parsedLanguageIds
      .map(id => mongoose.Types.ObjectId.isValid(id) ? id.toString() : null)
      .filter(Boolean);

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.LANGUAGE_REQUIRED
      });
    }

    const Language = require('../../models/admin/Language');
    const validLanguages = await Language.find({ _id: { $in: validIds } });
    const validLanguageIds = validLanguages.map(l => l._id.toString());

    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    // 🔒 normalize + dedupe by value
    const existingIds = (existingUser.languages || []).map(id => id.toString());
    const merged = [...new Set([...existingIds, ...validLanguageIds])];

    const allLanguageIds = merged.map(id => new mongoose.Types.ObjectId(id));

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { languages: allLanguageIds },
      { new: true }
    ).populate('languages', 'title');

    return res.json({
      success: true,
      message: "Languages updated successfully",
      data: { languages: user.languages }
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const normalizeName = name =>
  String(name).trim().toLowerCase().replace(/\s+/g, ' ');


// Update user hobbies
exports.updateHobbies = async (req, res) => {
  try {
    const hobbies = parseFormValue(req.body.hobbies);
    const userId = req.user._id;

    if (!Array.isArray(hobbies)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.HOBBIES_REQUIRED
      });
    }

    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    const processed = hobbies.map(item => ({
      id: item?.id || require('crypto').randomBytes(8).toString('hex'),
      name: String(item?.name || item)
    }));

    const map = new Map();

    for (const h of existingUser.hobbies || []) {
      map.set(normalizeName(h.name), h);
    }

    for (const h of processed) {
      map.set(normalizeName(h.name), h);
    }

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { hobbies: Array.from(map.values()) },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Hobbies updated successfully",
      data: { hobbies: user.hobbies }
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// Helper function to parse form-data values (handles JSON strings)
const parseFormValue = (value) => {
  if (!value) return value;
  if (typeof value === 'string') {
    // Remove surrounding quotes if present (handle multiple levels of quotes)
    let trimmed = value.trim();

    // Keep removing outer quotes until no more can be removed
    let previous;
    do {
      previous = trimmed;
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        trimmed = trimmed.slice(1, -1);
      }
    } while (trimmed !== previous && ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))));

    // Handle special case where string looks like an array literal with objects
    if (trimmed.startsWith('[') && trimmed.includes('{') && trimmed.includes('}')) {
      try {
        // Try to parse as JSON first
        return JSON.parse(trimmed);
      } catch (e) {
        // If JSON parsing fails, try to handle as string representation
        try {
          // Handle common form data issues
          let processed = trimmed
            .replace(/\n/g, '')
            .replace(/\t/g, '')
            .replace(/\r/g, '')
            .replace(/\'/g, "'");

          // Try to parse again
          return JSON.parse(processed);
        } catch (e2) {
          console.error('Failed to parse JSON (second attempt):', trimmed, e2);
          // If it's still failing, try to create proper array from string
          try {
            // If it looks like [item1, item2] with strings, try to convert
            if (trimmed.startsWith('["') && trimmed.endsWith('"]')) {
              return trimmed.slice(1, -1).split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
            }
          } catch (e3) {
            console.error('Failed to parse as string array:', e3);
          }

          // Return original value if all parsing attempts fail
          return value;
        }
      }
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

// Update user sports
exports.updateSports = async (req, res) => {
  try {
    const sports = parseFormValue(req.body.sports);
    const userId = req.user._id;

    if (!Array.isArray(sports)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.SPORTS_REQUIRED
      });
    }

    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    const processedSports = sports.map(item => ({
      id: item?.id || require('crypto').randomBytes(8).toString('hex'),
      name: String(item?.name || item)
    }));

    const map = new Map();

    // existing
    for (const s of existingUser.sports || []) {
      map.set(normalizeName(s.name), s);
    }

    // new
    for (const s of processedSports) {
      map.set(normalizeName(s.name), s);
    }

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { sports: Array.from(map.values()) },
      { new: true }
    );

    return res.json({ success: true, message: "Sports updated successfully", data: { sports: user.sports } });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// Update user film preferences
exports.updateFilm = async (req, res) => {
  try {
    const film = parseFormValue(req.body.film);
    const userId = req.user._id;

    if (!Array.isArray(film)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.FILM_REQUIRED
      });
    }

    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    const processed = film.map(item => ({
      id: item?.id || require('crypto').randomBytes(8).toString('hex'),
      name: String(item?.name || item)
    }));

    const map = new Map();

    for (const f of existingUser.film || []) {
      map.set(normalizeName(f.name), f);
    }

    for (const f of processed) {
      map.set(normalizeName(f.name), f);
    }

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { film: Array.from(map.values()) },
      { new: true }
    );

    return res.json({ success: true, message: "Film preferences updated successfully", data: { film: user.film } });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// Update user music preferences
exports.updateMusic = async (req, res) => {
  try {
    const music = parseFormValue(req.body.music);
    const userId = req.user._id;

    if (!Array.isArray(music)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.MUSIC_REQUIRED
      });
    }

    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    const processed = music.map(item => ({
      id: item?.id || require('crypto').randomBytes(8).toString('hex'),
      name: String(item?.name || item)
    }));

    const map = new Map();

    for (const m of existingUser.music || []) {
      map.set(normalizeName(m.name), m);
    }

    for (const m of processed) {
      map.set(normalizeName(m.name), m);
    }

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { music: Array.from(map.values()) },
      { new: true }
    );

    return res.json({ success: true, message: "Music preferences updated successfully", data: { music: user.music } });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


// Update user travel preferences
exports.updateTravel = async (req, res) => {
  try {
    const travel = parseFormValue(req.body.travel);
    const userId = req.user._id;

    if (!Array.isArray(travel)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.TRAVEL_REQUIRED
      });
    }

    const existingUser = await MaleUser.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    const processed = travel.map(item => ({
      id: item?.id || require('crypto').randomBytes(8).toString('hex'),
      name: String(item?.name || item)
    }));

    const map = new Map();

    for (const t of existingUser.travel || []) {
      map.set(normalizeName(t.name), t);
    }

    for (const t of processed) {
      map.set(normalizeName(t.name), t);
    }

    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { travel: Array.from(map.values()) },
      { new: true }
    );

    return res.json({ success: true, message: "Travel preferences updated successfully", data: { travel: user.travel } });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
// Register Male User and Send OTP
exports.registerUser = async (req, res) => {
  const { firstName, lastName, email, password, referralCode } = req.body;

  const otp = Math.floor(1000 + Math.random() * 9000);  // Generate 4-digit OTP

  try {
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    // Check if the email is already registered
    const existingUser = await MaleUser.findOne({ email });
    
    if (existingUser) {
      // If user exists but is not verified, allow re-registration
      if (!existingUser.isVerified || !existingUser.isActive) {
        // Update existing user with new OTP and referral info
        existingUser.otp = otp;
        existingUser.isVerified = false;
        existingUser.isActive = false;
        
        // Handle referral code if provided
        if (referralCode) {
          const referredByUser = await MaleUser.findOne({ referralCode });
          if (referredByUser) {
            existingUser.referredBy = [referredByUser._id];
          }
        }
        
        await existingUser.save();
        // await sendOtp(email, otp); // ⛔ TEMP DISABLED FOR TESTING
        
        // Trigger notification for account approval request
        await notificationService.handleEvent(notificationEvents.ACCOUNT_APPROVAL_REQUEST, {
          entityId: existingUser._id.toString(),
          entityType: 'male',
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName
        });
        
        return res.status(201).json({
          success: true,
          message: messages.AUTH.OTP_SENT_EMAIL,
          referralCode: existingUser.referralCode,
          otp: otp // For testing purposes
        });
      } else {
        // User is already verified and active
        return res.status(400).json({ 
          success: false, 
          message: messages.AUTH.USER_ALREADY_EXISTS
        });
      }
    }

    // Prepare referral linkage if provided and valid
    let referredByUser = null;
    if (referralCode) {
      referredByUser = await MaleUser.findOne({ referralCode });
    }

    // Ensure unique referral code
    let myReferral = generateReferralCode();
    while (await MaleUser.findOne({ referralCode: myReferral })) {
      myReferral = generateReferralCode();
    }

    // Create a new MaleUser
    const newUser = new MaleUser({ 
      firstName, 
      lastName, 
      email, 
      password, 
      otp, 
      referredBy: referredByUser ? [referredByUser._id] : [], 
      referralCode: myReferral,
      isVerified: false,
      isActive: false
    });
    await newUser.save();
    
    // Trigger notification for account approval request
    await notificationService.handleEvent(notificationEvents.ACCOUNT_APPROVAL_REQUEST, {
      entityId: newUser._id.toString(),
      entityType: 'male',
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    });
    
    // Send OTP via email (using a utility function like SendGrid or any mail service)
    // await sendOtp(email, otp);  // ⛔ TEMP DISABLED FOR TESTING

    res.status(201).json({
      success: true,
      message: messages.AUTH.OTP_SENT_EMAIL,
      referralCode: newUser.referralCode,
      otp: otp // For testing purposes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Login Male User (Send OTP)
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
    const user = await MaleUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Check if user is verified
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
    // await sendOtp(email, otp); // ⛔ TEMP DISABLED FOR TESTING

    res.json({
      success: true,
      message: messages.AUTH.OTP_SENT_LOGIN,
      otp: otp // For testing purposes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Verify Login OTP
exports.verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    // If email is provided, look for user by both email and otp
    // If only otp is provided, look for user by otp who is verified
    let user;
    if (email) {
      user = await MaleUser.findOne({ email, otp, isVerified: true });
    } else if (otp) {
      user = await MaleUser.findOne({ otp, isVerified: true });
    } else {
      return res.status(400).json({ success: false, message: messages.COMMON.EMAIL_OR_OTP_REQUIRED });
    }
    
    if (user) {
      // Clear OTP after successful login
      user.otp = undefined;
      await user.save();

      // Generate JWT token
      const token = generateToken(user._id, 'male');

      res.json({
        success: true,
        message: messages.AUTH.LOGIN_SUCCESS,
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          reviewStatus: user.reviewStatus
        }
      });
    } else {
      res.status(400).json({ success: false, message: messages.COMMON.INVALID_OTP });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Verify OTP and complete registration
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    // If email is provided, look for user by both email and otp
    // If only otp is provided, look for user by otp who is not yet verified
    let user;
    if (email) {
      user = await MaleUser.findOne({ email, otp });
    } else if (otp) {
      user = await MaleUser.findOne({ otp, isVerified: false });
    } else {
      return res.status(400).json({ success: false, message: messages.COMMON.EMAIL_OR_OTP_REQUIRED });
    }
    
    if (!user) {
      return res.status(400).json({ success: false, message: messages.COMMON.INVALID_OTP });
    }
    
    user.isVerified = true;
    user.isActive = true;    // Mark the user as active
    user.otp = undefined;  // Clear OTP after verification

    await user.save();

    res.json({ 
      success: true, 
      message: messages.AUTH.OTP_VERIFIED,
      data: {
        token: generateToken(user._id, 'male'),
        user: {
          id: user._id,
          email: user.email,
          isVerified: user.isVerified,
          isActive: user.isActive,
          reviewStatus: user.reviewStatus
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Upload Images (multipart form-data)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: messages.IMAGE.NO_IMAGES });
    }

    const uploadToCloudinary = require('../../utils/cloudinaryUpload');
    
    // Save each image in Image collection and keep track of them
    const savedImages = [];
    for (const f of req.files) {
      try {
        const result = await uploadToCloudinary(f.buffer, 'admin_uploads', 'image');
        const imageUrl = result.secure_url;
        const newImage = new Image({ maleUserId: req.user.id, imageUrl: imageUrl });
        const savedImage = await newImage.save();
        savedImages.push(savedImage);
      } catch (uploadErr) {
        console.error('Image upload error:', uploadErr);
        return res.status(500).json({ success: false, message: 'Failed to upload image to Cloudinary', error: uploadErr.message });
      }
    }
    
    // Also persist to MaleUser.images array as references to Image documents
    const user = await MaleUser.findById(req.user.id);
    const newImageIds = savedImages.map(img => img._id);
    user.images = Array.isArray(user.images) ? [...user.images, ...newImageIds] : newImageIds;
    await user.save();

    const uploadedUrls = savedImages.map(img => img.imageUrl);
    res.json({ success: true, message: messages.IMAGE.IMAGE_UPLOAD_SUCCESS, urls: uploadedUrls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Buy Coins - DEPRECATED: Use proper Razorpay payment flow instead
// This function is dangerous as it credits coins without payment verification
exports.buyCoins = async (req, res) => {
  return res.status(400).json({ 
    success: false, 
    message: 'Use /payment/coin/order + /payment/verify for secure coin purchase' 
  });
  /*
  const { packageId } = req.body;
  try {
    const selectedPackage = await Package.findById(packageId);
    const maleUser = await MaleUser.findById(req.user.id);
    maleUser.balance += selectedPackage.coins;  // DANGEROUS: No payment verification!
    await maleUser.save();
    res.json({ success: true, message: messages.COINS.COINS_ADDED(selectedPackage.coins) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
  */
};

// Get Male User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await MaleUser.findById(req.user.id)
      .select('-otp -password')
      .populate('interests', 'title _id status')
      .populate('languages', 'title _id status')
      .populate('relationshipGoals', 'title _id status')
      .populate('religion', 'title _id status')
      .populate({
        path: 'images',
        select: 'maleUserId imageUrl createdAt updatedAt'
      })
      .populate({
        path: 'favourites',
        select: 'name email'
      });
      
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// List/browse female users for male users (paginated)
exports.listFemaleUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Get list of users that the current male user has blocked
    const blockedByCurrentUser = await MaleBlockList.find({ maleUserId: req.user.id }).select('blockedUserId');
    const blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current male user
    const blockedByOthers = await FemaleBlockList.find({ blockedUserId: req.user.id }).select('femaleUserId');
    const blockedByOthersIds = blockedByOthers.map(block => block.femaleUserId);

    const filter = { 
      status: 'active', 
      reviewStatus: 'accepted',
      _id: { 
        $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds] // Exclude users blocked by either party
      }
    };

    // Get female users
    const [items, total] = await Promise.all([
      FemaleUser.find(filter)
        .select('_id name age gender bio images onlineStatus hideAge')
        .populate({ path: 'images', select: 'imageUrl' })
        .skip(skip)
        .limit(limit)
        .lean(),
      FemaleUser.countDocuments(filter)
    ]);

    // Define field maps for visibility rules
    const FEMALE_PUBLIC_FIELDS = [
      '_id',
      'name',
      'age',
      'gender',
      'bio',
      'images',
      'onlineStatus'
    ];

    const FEMALE_MUTUAL_FIELDS = [
      '_id',
      'name',
      'age',
      'gender',
      'bio',
      'email',
      'images',
      'interests',
      'languages',
      'hobbies',
      'sports',
      'music',
      'travel',
      'film',
      'onlineStatus'
    ];

    // Check for mutual follow relationships
    const maleUserId = req.user._id;
    const maleFollowing = await MaleFollowing.find({ maleUserId }).select('femaleUserId');
    const maleFollowingIds = new Set(maleFollowing.map(f => f.femaleUserId.toString()));
    
    const femaleFollowing = await FemaleFollowing.find({ femaleUserId: { $in: items.map(item => item._id) }, maleUserId });
    const femaleFollowingMap = new Map(femaleFollowing.map(f => [f.maleUserId.toString(), f.femaleUserId.toString()]));

    // Process each female user with appropriate visibility
    const data = items.map((u) => {
      // Check if mutual follow exists
      const isMutual = maleFollowingIds.has(u._id.toString()) && 
                    femaleFollowingMap.has(maleUserId.toString()) &&
                    femaleFollowingMap.get(maleUserId.toString()) === u._id.toString();

      // Determine allowed fields based on mutual follow status
      const allowedFields = isMutual ? FEMALE_MUTUAL_FIELDS : FEMALE_PUBLIC_FIELDS;
      
      const response = {};
      
      // Apply field filtering
      allowedFields.forEach(field => {
        if (u[field] !== undefined) {
          // Handle age visibility based on hideAge setting
          if (field === 'age' && u.hideAge && !isMutual) {
            // Don't include age if hideAge is true and not mutual
            return;
          }
          
          // Handle images - only first image before mutual follow
          if (field === 'images') {
            if (isMutual) {
              response[field] = u[field];
            } else {
              // Before mutual follow, only show first image
              response[field] = Array.isArray(u[field]) && u[field].length > 0 ? [u[field][0]] : [];
            }
          } else {
            response[field] = u[field];
          }
        }
      });
      
      // If not mutual and age is hidden, remove it from response
      if (!isMutual && u.hideAge) {
        delete response.age;
      }
      
      // Add email only after mutual follow
      if (isMutual && u.email) {
        response.email = u.email;
      }
      
      return response;
    });

    return res.json({ success: true, page, limit, total, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Complete male profile and award referral bonus if applicable
exports.completeProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await MaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Check if profile is already completed
    if (user.profileCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile already completed'
      });
    }

    // Update profile completion status
    user.profileCompleted = true;
    await user.save();
    
    // Process referral bonus if the user was referred
    if (user.referredBy && user.referredBy.length > 0) {
      const processReferralBonus = require('../../utils/processReferralBonus');
      const result = await processReferralBonus(user, 'male');
      if (result) {
        console.log(`Referral bonus processed for male user ${user._id} after profile completion`);
      }
    }
    
    return res.json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        profileCompleted: true
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete an image by image id (owned by the authenticated male user)
exports.deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const imageDoc = await Image.findById(imageId);
    if (!imageDoc) {
      return res.status(404).json({ success: false, message: messages.USER.IMAGE_NOT_FOUND });
    }
    if (String(imageDoc.maleUserId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: messages.USER.NOT_AUTHORIZED_DELETE_IMAGE });
    }
    await Image.deleteOne({ _id: imageDoc._id });

    // Remove image ObjectId from MaleUser.images array if it exists there
    try {
      const user = await MaleUser.findById(req.user.id);
      if (Array.isArray(user.images)) {
        user.images = user.images.filter((imageId) => String(imageId) !== String(imageDoc._id));
        await user.save();
      }
    } catch (_) {}

    return res.json({ success: true, message: messages.IMAGE.IMAGE_DELETED });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user profile and upload image in a single formData request
exports.updateProfileAndImage = async (req, res) => {
  try {
    const user = await MaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Helper to convert values to ObjectId array
    const toObjectIdArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      
      return arr
        .map(id => mongoose.Types.ObjectId.isValid(id) ? id : null)
        .filter(Boolean);
    };
    
    // Helper function to parse form-data values (handles JSON strings)
    const parseFormValue = (value) => {
      if (!value) return value;
      if (typeof value === 'string') {
        // Remove surrounding quotes if present (handle multiple levels of quotes)
        let trimmed = value.trim();
        
        // Keep removing outer quotes until no more can be removed
        let previous;
        do {
          previous = trimmed;
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
              (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            trimmed = trimmed.slice(1, -1);
          }
        } while (trimmed !== previous && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                                        (trimmed.startsWith("'") && trimmed.endsWith("'"))));
        
        // Additional cleanup: remove any remaining escaped quotes
        trimmed = trimmed.replace(/\"/g, '"');
        
        // Handle special case where string looks like an array literal with objects
        // This happens when form-data sends string representations of arrays
        if (trimmed.startsWith('[') && trimmed.includes('{') && trimmed.includes('}')) {
          try {
            // Try to parse as JSON first
            return JSON.parse(trimmed);
          } catch (e) {
            // If JSON parsing fails, try to handle as string representation
            try {
              // Handle common form data issues
              let processed = trimmed
                .replace(/\n/g, '')
                .replace(/\t/g, '')
                .replace(/\r/g, '')
                .replace(/\'/g, "'");
              
              // Try to parse again
              return JSON.parse(processed);
            } catch (e2) {
              console.error('Failed to parse JSON (second attempt):', trimmed, e2);
              // If it's still failing, try to create proper array from string
              try {
                // If it looks like [item1, item2] with strings, try to convert
                if (trimmed.startsWith('["') && trimmed.endsWith('"]')) {
                  return trimmed.slice(1, -1).split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
                }
              } catch (e3) {
                console.error('Failed to parse as string array:', e3);
              }
              
              // Return original value if all parsing attempts fail
              return value;
            }
          }
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
    const firstName = parseFormValue(req.body.firstName);
    const lastName = parseFormValue(req.body.lastName);
    const age = parseFormValue(req.body.age);
    const mobileNumber = parseFormValue(req.body.mobileNumber);
    const dateOfBirth = parseFormValue(req.body.dateOfBirth);
    const gender = parseFormValue(req.body.gender);
    const bio = parseFormValue(req.body.bio);
    const interests = parseFormValue(req.body.interests);
    const languages = parseFormValue(req.body.languages);
    const religion = parseFormValue(req.body.religion);
    const relationshipGoals = parseFormValue(req.body.relationshipGoals);
    const height = parseFormValue(req.body.height);
    const searchPreferences = parseFormValue(req.body.searchPreferences);
    const hobbies = parseFormValue(req.body.hobbies);
    const sports = parseFormValue(req.body.sports);
    const film = parseFormValue(req.body.film);
    const music = parseFormValue(req.body.music);
    const travel = parseFormValue(req.body.travel);
    const latitude = parseFormValue(req.body.latitude);
    const longitude = parseFormValue(req.body.longitude);
    const profileCompleted = parseFormValue(req.body.profileCompleted);

    // Update basic fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (age !== undefined) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
        return res.status(400).json({
          success: false,
          message: "Age must be a valid number between 0 and 150"
        });
      }
      user.age = parsedAge;
    }
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (dateOfBirth) {
      // Handle date string properly to avoid timezone conversion
      if (typeof dateOfBirth === 'string') {
        // Parse date string in a way that preserves the date without timezone shift
        const dateParts = dateOfBirth.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
          const day = parseInt(dateParts[2]);
          // Create date object at noon UTC to avoid timezone issues
          user.dateOfBirth = new Date(Date.UTC(year, month, day));
        } else {
          user.dateOfBirth = new Date(dateOfBirth);
        }
      } else {
        user.dateOfBirth = dateOfBirth;
      }
    }
    if (gender) user.gender = gender;
    if (bio) user.bio = bio;
    if (height) user.height = height;
    if (searchPreferences) user.searchPreferences = searchPreferences;
    
    // Handle location updates - ✅ ALWAYS save if provided
    if (latitude !== undefined && longitude !== undefined) {
      // Validate coordinates if both provided
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be a number between -90 and 90'
        });
      }
      
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be a number between -180 and 180'
        });
      }
      
      // ✅ ALWAYS SAVE if provided
      user.latitude = lat;
      user.longitude = lng;
    } else if (latitude !== undefined) {
      // Handle only latitude provided
      const lat = parseFloat(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be a number between -90 and 90'
        });
      }
      user.latitude = lat;
    } else if (longitude !== undefined) {
      // Handle only longitude provided
      const lng = parseFloat(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be a number between -180 and 180'
        });
      }
      user.longitude = lng;
    }
    
    // Handle profile completion status - validation only
    if (profileCompleted !== undefined) {
      // If profile is being marked as completed, ensure location is provided
      if (profileCompleted === true || profileCompleted === 'true') {
        if (user.latitude === undefined || user.longitude === undefined) {
          return res.status(400).json({ 
            success: false, 
            message: 'Latitude and longitude are required for profile completion'
          });
        }
        user.profileCompleted = true;
      } else {
        user.profileCompleted = false;
      }
    } else {
      // For male users, if they're submitting profile data with required fields (including location),
      // we can consider it as profile completion since no admin approval is needed
      if (user.latitude !== undefined && user.longitude !== undefined) {
        // Check if this is a complete profile request (has essential profile fields)
        const hasEssentialFields = firstName && lastName && mobileNumber && dateOfBirth && gender && bio;
        if (hasEssentialFields) {
          user.profileCompleted = true;
          // For male users, reviewStatus can be set to 'accepted' immediately
          // since no admin approval is required
          user.reviewStatus = 'accepted';
        }
      }
    }
    
    // Update interests if provided and validate
    if (req.body.interests !== undefined) {
      let interestArray = parseFormValue(req.body.interests);

      if (!Array.isArray(interestArray)) {
        return res.status(400).json({
          success: false,
          message: "Invalid interests format"
        });
      }

      const validIds = interestArray.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length > 0) {
        const Interest = require('../../models/admin/Interest');
        const validInterests = await Interest.find({ _id: { $in: validIds } });

        user.interests = validInterests.map(i => i._id);
      }
      // ❌ DO NOT clear interests if empty
    }
    
    // Update languages if provided and validate
    if (req.body.languages !== undefined) {
      let languageArray = parseFormValue(req.body.languages);

      if (!Array.isArray(languageArray)) {
        return res.status(400).json({
          success: false,
          message: "Invalid languages format"
        });
      }

      const validIds = languageArray.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length > 0) {
        const Language = require('../../models/admin/Language');
        const validLanguages = await Language.find({ _id: { $in: validIds } });

        user.languages = validLanguages.map(l => l._id);
      }
      // ❌ DO NOT clear languages if empty
    }
    
    // Update religion if provided and validate
    if (religion !== undefined) {
      // Validate if religion is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(religion)) {
        user.religion = religion;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid religion ID provided"
        });
      }
    }
    
    // Update relationship goals if provided and validate
    if (relationshipGoals) {
      const RelationGoal = require('../../models/admin/RelationGoal');
      const goalArray = Array.isArray(relationshipGoals) ? relationshipGoals : [relationshipGoals];
      const validGoals = await RelationGoal.find({ _id: { $in: goalArray } });
      user.relationshipGoals = validGoals.map(g => g._id);
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
            // If it's already an object with id and name, return as is
            if (item.id && item.name) {
              return { id: item.id, name: item.name };
            }
            // If it's an object with name property but no id, generate an id
            else if (item.name) {
              const id = require('crypto').randomBytes(8).toString('hex');
              return { id, name: item.name };
            }
            // If it's a complex object, try to get the name property
            else {
              const name = Object.values(item)[0]; // Get first value as name
              const id = require('crypto').randomBytes(8).toString('hex');
              return { id, name: String(name) };
            }
          }
          
          // Handle string - convert to object with generated id
          const id = require('crypto').randomBytes(8).toString('hex');
          return { id, name: String(item) };
        }).filter(Boolean);
        
        console.log(`  Processed ${fieldName}:`, processed);
        return processed;
      } catch (err) {
        console.error(`Error processing ${fieldName}:`, err);
        throw err;
      }
    };
    
    // Update preferences - APPEND new items to existing arrays
    if (hobbies) {
      const newHobbies = processPreferenceArray(hobbies, 'hobbies');
      if (newHobbies && newHobbies.length > 0) {
        const existingIds = (user.hobbies || []).map(h => h.id);
        const uniqueNew = newHobbies.filter(h => !existingIds.includes(h.id));
        user.hobbies = [...(user.hobbies || []), ...uniqueNew];
      }
    }
    
    if (sports) {
      const newSports = processPreferenceArray(sports, 'sports');
      if (newSports && newSports.length > 0) {
        const existingIds = (user.sports || []).map(s => s.id);
        const uniqueNew = newSports.filter(s => !existingIds.includes(s.id));
        user.sports = [...(user.sports || []), ...uniqueNew];
      }
    }
    
    if (film) {
      const newFilm = processPreferenceArray(film, 'film');
      if (newFilm && newFilm.length > 0) {
        const existingIds = (user.film || []).map(f => f.id);
        const uniqueNew = newFilm.filter(f => !existingIds.includes(f.id));
        user.film = [...(user.film || []), ...uniqueNew];
      }
    }
    
    if (music) {
      const newMusic = processPreferenceArray(music, 'music');
      if (newMusic && newMusic.length > 0) {
        const existingIds = (user.music || []).map(m => m.id);
        const uniqueNew = newMusic.filter(m => !existingIds.includes(m.id));
        user.music = [...(user.music || []), ...uniqueNew];
      }
    }
    
    if (travel) {
      const newTravel = processPreferenceArray(travel, 'travel');
      if (newTravel && newTravel.length > 0) {
        const existingIds = (user.travel || []).map(t => t.id);
        const uniqueNew = newTravel.filter(t => !existingIds.includes(t.id));
        user.travel = [...(user.travel || []), ...uniqueNew];
      }
    }
    
    // Handle image upload if files are provided
    if (req.files && req.files.length > 0) {
      // Map file objects to URLs, ensuring we have valid URLs
      const uploadedUrls = req.files
        .map((f) => f.path || f.url || f.secure_url)
        .filter(url => url); // Only keep valid URLs

      // Save each image in Image collection and get the saved documents
      const savedImages = [];
      for (const url of uploadedUrls) {
        if (url) { // Double-check URL exists
          const newImage = new Image({ maleUserId: req.user.id, imageUrl: url });
          const savedImage = await newImage.save();
          savedImages.push(savedImage);
        }
      }

      // Update the user's images array to reference the Image documents
      // We'll update this to use the IDs from the Image collection
      const newImageIds = savedImages.map(img => img._id);
      user.images = Array.isArray(user.images) ? [...user.images, ...newImageIds] : newImageIds;
    }
    
    // Save user with timeout to prevent hanging
    try {
      const savePromise = user.save();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Save operation timeout')), 15000); // 15 second timeout
      });
      
      await Promise.race([savePromise, timeoutPromise]);
    } catch (saveErr) {
      console.error('Error saving user in updateProfileAndImage:', saveErr);
      return res.status(500).json({ 
        success: false, 
        error: 'Save operation failed or timed out',
        message: 'Unable to save profile update, please try again later.'
      });
    }
    
    // Return updated user with populated fields
    const updatedUser = await MaleUser.findById(user._id)
      .populate('interests', 'title')
      .populate('languages', 'title')
      .populate('relationshipGoals', 'title')
      .populate({
        path: 'images',
        select: 'imageUrl createdAt updatedAt'
      });
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: updatedUser 
    });
  } catch (err) {
    console.error('❌ Error in updateProfileAndImage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a specific preference item
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
    
    const user = await MaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Remove item by finding the object with matching _id field
    const originalLength = (user[type] || []).length;
    user[type] = (user[type] || []).filter(item => String(item._id) !== String(itemId));
    
    if (user[type].length === originalLength) {
      return res.status(404).json({ 
        success: false, 
        message: `Item with id ${itemId} not found in ${type}` 
      });
    }
    
    await user.save();
    
    return res.json({ 
      success: true, 
      message: `${type} item deleted successfully`,
      data: {
        type,
        deletedItemValue: itemId,
        remainingCount: user[type].length
      }
    });
  } catch (err) {
    console.error('❌ Error in deletePreferenceItem:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update basic profile details
exports.updateProfileDetails = async (req, res) => {
  try {
    const { firstName, lastName, age, dateOfBirth, searchPreferences, bio, height, religion } = req.body;
    const userId = req.user._id;
    
    // Create update object with only provided fields
    const updateData = {};
    
    if (firstName !== undefined) {
      updateData.firstName = firstName;
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }
    if (age !== undefined) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
        return res.status(400).json({
          success: false,
          message: "Age must be a valid number between 0 and 150"
        });
      }
      updateData.age = parsedAge;
    }
    if (dateOfBirth !== undefined) {
      // Parse date to handle timezone properly
      const parsedDate = new Date(dateOfBirth);
      updateData.dateOfBirth = parsedDate;
    }
    if (searchPreferences !== undefined) {
      updateData.searchPreferences = searchPreferences;
    }
    if (bio !== undefined) {
      updateData.bio = bio;
    }
    if (height !== undefined) {
      updateData.height = height;
    }
    if (religion !== undefined) {
      // Validate if religion is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(religion)) {
        updateData.religion = religion;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid religion ID provided"
        });
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update"
      });
    }
    
    const user = await MaleUser.findByIdAndUpdate(
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

// Delete a specific interest
exports.deleteInterest = async (req, res) => {
  try {
    const { interestId } = req.params;
    const user = await MaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Remove interest by ObjectId
    const originalLength = (user.interests || []).length;
    user.interests = (user.interests || []).filter(interest => String(interest) !== String(interestId));
    
    if (user.interests.length === originalLength) {
      return res.status(404).json({ 
        success: false, 
        message: `Interest with id ${interestId} not found` 
      });
    }
    
    await user.save();
    
    return res.json({ 
      success: true, 
      message: 'Interest removed successfully',
      data: {
        removedInterestId: interestId
      }
    });
  } catch (err) {
    console.error('❌ Error in deleteInterest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a specific language
exports.deleteLanguage = async (req, res) => {
  try {
    const { languageId } = req.params;
    const user = await MaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }
    
    // Remove language by ObjectId
    const originalLength = (user.languages || []).length;
    user.languages = (user.languages || []).filter(language => String(language) !== String(languageId));
    
    if (user.languages.length === originalLength) {
      return res.status(404).json({ 
        success: false, 
        message: `Language with id ${languageId} not found` 
      });
    }
    
    await user.save();
    
    return res.json({ 
      success: true, 
      message: 'Language removed successfully',
      data: {
        removedLanguageId: languageId
      }
    });
  } catch (err) {
    console.error('❌ Error in deleteLanguage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
};

// Get male dashboard with All, Nearby, Followed, New sections
exports.getDashboard = async (req, res) => {
  try {
    const maleUserId = req.user._id;
    const { section = 'all', page = 1, limit = 10, location, search } = req.body;
    const skip = (page - 1) * limit;

    // Validate section parameter
    const validSections = ['all', 'nearby', 'follow', 'new'];
    if (!validSections.includes(section.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid section. Use 'all', 'nearby', 'follow', or 'new'"
      });
    }

    // Validate required parameters for nearby section
    if (section.toLowerCase() === 'nearby' && (!location?.latitude || !location?.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Location with latitude and longitude are required for nearby section'
      });
    }

    // Get admin config for nearby distance settings and new user window
    const adminConfig = await AdminConfig.getConfig(); 
    const nearbyDistanceValue = adminConfig.nearbyDistanceValue || 5; // Default 5 km
    const nearbyDistanceUnit = adminConfig.nearbyDistanceUnit || 'km'; // Default km
    const newUserWindowDays = adminConfig.newUserWindowDays || 7; // Default 7 days for new users
    
    // Base filter for all female users
    const baseFilter = {
      status: 'active',
      reviewStatus: 'accepted',
      onlineStatus: true, // Only show online females
      profileCompleted: true
    };

    // Add search filter if provided
    if (search) {
      baseFilter.name = { $regex: search, $options: 'i' };
    }

    // Get list of users that the current male user has blocked
    const blockedByCurrentUser = await MaleBlockList.find({ maleUserId }).select('blockedUserId');
    const blockedByCurrentUserIds = blockedByCurrentUser.map(block => block.blockedUserId);
    
    // Get list of users who have blocked the current male user
    const blockedByOthers = await FemaleBlockList.find({ blockedUserId: maleUserId }).select('femaleUserId');
    const blockedByOthersIds = blockedByOthers.map(block => block.femaleUserId);
    
    // Add block filter to base filter
    baseFilter._id = { 
      $nin: [...blockedByCurrentUserIds, ...blockedByOthersIds] 
    };
    
    let results = [];
    let total = 0;
    
    switch (section.toLowerCase()) {
      case 'all':
        // Get all online females matching base criteria
        [results, total] = await Promise.all([
          FemaleUser.find(baseFilter)
            .select('_id name age images hideAge createdAt languages')
            .populate({ path: 'images', select: 'imageUrl' })
            .populate({ path: 'languages', select: 'title' })
            .sort({ createdAt: -1 }) // Most recent first
            .skip(skip)
            .limit(limit)
            .lean(),
          FemaleUser.countDocuments(baseFilter)
        ]);
        break;
        
      case 'nearby':
        // Update male user's location with live coordinates from request
        await MaleUser.findByIdAndUpdate(maleUserId, {
          latitude: location.latitude,
          longitude: location.longitude,
          locationUpdatedAt: new Date()
        });

        // First get all eligible females with location freshness (TTL check)
        const TTL_MINUTES = 15;
        const cutoffTime = new Date(Date.now() - TTL_MINUTES * 60 * 1000);
        
        // Apply TTL check in MongoDB query for efficiency
        const allEligibleFemales = await FemaleUser.find({
          ...baseFilter,
          locationUpdatedAt: { $gte: cutoffTime }  // Only users with recent location updates
        })
          .select('_id name age images hideAge latitude longitude locationUpdatedAt languages')
          .populate({ path: 'images', select: 'imageUrl' })
          .populate({ path: 'languages', select: 'title' })
          .lean();
        
        // Filter by distance
        const nearbyFemales = allEligibleFemales.filter(female => {
          if (!female.latitude || !female.longitude) {
            return false; // Skip females without location
          }
          
          const distance = calculateDistance(
            location.latitude,  // Use live location from request
            location.longitude,
            female.latitude,
            female.longitude
          );
          
          // Convert admin distance to km if needed
          const adminDistanceInKm = nearbyDistanceUnit === 'm' ? nearbyDistanceValue / 1000 : nearbyDistanceValue;
          
          return distance <= adminDistanceInKm;
        });
        
        // Sort by distance (closest first) and apply pagination
        nearbyFemales.sort((a, b) => {
          const distA = calculateDistance(
            location.latitude,  // Use live location from request
            location.longitude,
            a.latitude,
            a.longitude
          );
          const distB = calculateDistance(
            location.latitude,  // Use live location from request
            location.longitude,
            b.latitude,
            b.longitude
          );
          return distA - distB;
        });
        
        total = nearbyFemales.length;
        results = nearbyFemales.slice(skip, skip + limit);
        break;
        
      case 'follow':
        // Get list of females the male is following
        const following = await MaleFollowing.find({ maleUserId }).select('femaleUserId');
        const followingIds = following.map(f => f.femaleUserId);
        
        // Filter base filter to only include followed users
        const followedFilter = {
          ...baseFilter,
          _id: { $in: followingIds }
        };
        
        [results, total] = await Promise.all([
          FemaleUser.find(followedFilter)
            .select('_id name age images hideAge languages')
            .populate({ path: 'images', select: 'imageUrl' })
            .populate({ path: 'languages', select: 'title' })
            .skip(skip)
            .limit(limit)
            .lean(),
          FemaleUser.countDocuments(followedFilter)
        ]);
        break;
        
      case 'new':
        // Get females who registered recently within the configured window
        const newWindowDate = new Date();
        newWindowDate.setDate(newWindowDate.getDate() - newUserWindowDays);
        
        const newFilter = {
          ...baseFilter,
          createdAt: { $gte: newWindowDate }
        };
        
        [results, total] = await Promise.all([
          FemaleUser.find(newFilter)
            .select('_id name age images hideAge createdAt languages')
            .populate({ path: 'images', select: 'imageUrl' })
            .populate({ path: 'languages', select: 'title' })
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(limit)
            .lean(),
          FemaleUser.countDocuments(newFilter)
        ]);
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          message: "Invalid section. Use 'all', 'nearby', 'follow', or 'new'" 
        });
    }
    
    // Format response data
    const formattedResults = results.map(female => {
      // Apply age visibility based on hideAge setting
      const response = {
        _id: female._id,
        name: female.name,
        // Add first image URL directly instead of array
        imageUrl: female.images && female.images.length > 0 ? female.images[0].imageUrl : null,
        // Transform language IDs to language names
        languages: female.languages && female.languages.length > 0 ? 
          female.languages.map(lang => lang.title || 'Unknown Language') : []
      };
      
      // Add age only if not hidden
      if (!female.hideAge) {
        response.age = female.age;
      }
      
      // Add distance for nearby section
      if (section.toLowerCase() === 'nearby' && female.latitude && female.longitude) {
        const distance = calculateDistance(
          location.latitude,  // Use live location from request
          location.longitude,
          female.latitude,
          female.longitude
        );
        response.distance = Math.round(distance * 100) / 100; // Round to 2 decimal places
        response.distanceUnit = 'km';
      }
      
      // Add registration date for new section
      if (section.toLowerCase() === 'new') {
        response.registeredAt = female.createdAt;
      }
      
      return response;
    });
    
    return res.json({
      success: true,
      data: {
        section: section.toLowerCase(),
        results: formattedResults,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalResults: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error('❌ Error in getDashboard:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update male user location

// Delete male user account permanently
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`Deleting male user account: ${userId}`);
    
    // Find the user first to get reference data
    const user = await MaleUser.findById(userId);
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
    await Image.deleteMany({
      userId: userId
    });
    
    // Finally, delete the user account
    await MaleUser.findByIdAndDelete(userId);
    
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
    console.error('Error deleting male user account:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};

