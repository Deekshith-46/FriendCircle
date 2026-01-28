const MaleUser = require('../../models/maleUser/MaleUser');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');

// Add or replace profile details (idempotent upsert-like behavior for owned fields)
exports.addDetails = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      mobileNumber,
      dateOfBirth,
      gender,
      bio,
      interests,
      languages,
      religion,
      relationshipGoals,
      height,
      searchPreferences,
      images
    } = req.body;

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }
    
    // Validate mobile number if provided
    if (mobileNumber && !isValidMobile(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: messages.VALIDATION.INVALID_MOBILE
      });
    }

    const user = await MaleUser.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;
    if (bio !== undefined) user.bio = bio;
    if (Array.isArray(interests)) user.interests = interests;
    if (Array.isArray(languages)) user.languages = languages;
    if (religion !== undefined) user.religion = religion;
    if (Array.isArray(relationshipGoals)) user.relationshipGoals = relationshipGoals;
    if (height !== undefined) user.height = height;
    if (searchPreferences !== undefined) user.searchPreferences = searchPreferences;
    if (Array.isArray(images)) user.images = images;

    await user.save();
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update details (partial patch)
exports.updateDetails = async (req, res) => {
  try {
    // Validate email if provided in body
    if (req.body.email && !isValidEmail(req.body.email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }
    
    // Validate mobile number if provided in body
    if (req.body.mobileNumber && !isValidMobile(req.body.mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: messages.VALIDATION.INVALID_MOBILE
      });
    }

    const update = { ...req.body };
    const allowed = new Set([
      'firstName','lastName','email','mobileNumber','dateOfBirth','gender','bio',
      'interests','languages','religion','relationshipGoals','height','searchPreferences','images'
    ]);
    Object.keys(update).forEach((k) => { if (!allowed.has(k)) delete update[k]; });

    const user = await MaleUser.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete details (clear selected fields)
exports.deleteDetails = async (req, res) => {
  try {
    const fieldsToClear = req.body?.fields || [];
    const user = await MaleUser.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });

    const clearable = new Set([
      'firstName','lastName','email','mobileNumber','dateOfBirth','gender','bio',
      'interests','languages','religion','relationshipGoals','height','searchPreferences','images'
    ]);

    fieldsToClear.forEach((field) => {
      if (clearable.has(field)) {
        if (Array.isArray(user[field])) user[field] = [];
        else user[field] = undefined;
      }
    });

    await user.save();
    return res.json({ success: true, message: 'Selected details deleted', data: user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};