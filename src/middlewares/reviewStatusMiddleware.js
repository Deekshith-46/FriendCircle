const messages = require('../validations/messages');

/**
 * Middleware to enforce access control based on reviewStatus
 * This middleware should be applied AFTER authMiddleware
 * 
 * Usage:
 * - requireProfileCompleted: Blocks access if profile not completed
 * - requireReviewAccepted: Blocks access if reviewStatus is not 'accepted'
 * - allowOnlyCompleteProfile: Only allows access if reviewStatus is 'completeProfile'
 */

// Middleware: Allow access only if profile is completed
const requireProfileCompleted = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: messages.COMMON.UNAUTHORIZED 
    });
  }

  if (!req.user.profileCompleted) {
    return res.status(403).json({
      success: false,
      message: messages.REGISTRATION.PROFILE_NOT_COMPLETED,
      redirectTo: 'COMPLETE_PROFILE'
    });
  }

  next();
};

// Middleware: Allow access only if reviewStatus is 'accepted'
const requireReviewAccepted = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: messages.COMMON.UNAUTHORIZED 
    });
  }

  // Check reviewStatus
  if (req.user.reviewStatus === 'completeProfile') {
    return res.status(403).json({
      success: false,
      message: messages.REGISTRATION.PROFILE_NOT_COMPLETED,
      redirectTo: 'COMPLETE_PROFILE'
    });
  }

  if (req.user.reviewStatus === 'pending') {
    return res.status(403).json({
      success: false,
      message: messages.REGISTRATION.REGISTRATION_UNDER_REVIEW,
      redirectTo: 'UNDER_REVIEW'
    });
  }

  if (req.user.reviewStatus === 'rejected') {
    return res.status(403).json({
      success: false,
      message: messages.REGISTRATION.REGISTRATION_REJECTED,
      redirectTo: 'REJECTED'
    });
  }

  // Only 'accepted' status passes through
  if (req.user.reviewStatus !== 'accepted') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid review status.',
      redirectTo: 'COMPLETE_PROFILE'
    });
  }

  next();
};

// Middleware: Allow access only if reviewStatus is 'completeProfile' (for profile completion flow)
const allowOnlyCompleteProfile = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: messages.COMMON.UNAUTHORIZED 
    });
  }

  // Allow access for both 'completeProfile' status (initial completion) and 'rejected' status (resubmission)
  if (req.user.reviewStatus !== 'completeProfile' && req.user.reviewStatus !== 'rejected') {
    return res.status(403).json({
      success: false,
      message: 'Profile already completed or under review.',
      data: {
        reviewStatus: req.user.reviewStatus,
        profileCompleted: req.user.profileCompleted
      }
    });
  }

  next();
};

// Helper function to get redirect based on review status
const getRedirectByStatus = (reviewStatus) => {
  const redirectMap = {
    'completeProfile': 'COMPLETE_PROFILE',
    'pending': 'UNDER_REVIEW',
    'accepted': 'DASHBOARD',
    'rejected': 'REJECTED'
  };
  
  return redirectMap[reviewStatus] || 'COMPLETE_PROFILE';
};

module.exports = {
  requireProfileCompleted,
  requireReviewAccepted,
  allowOnlyCompleteProfile,
  getRedirectByStatus
};
