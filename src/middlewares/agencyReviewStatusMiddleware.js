const messages = require('../validations/messages');

/**
 * Agency-specific middleware to enforce access control based on reviewStatus
 * This middleware should be applied AFTER authMiddleware
 * 
 * Usage:
 * - requireAgencyProfileCompleted: Blocks access if agency profile not completed
 * - requireAgencyReviewAccepted: Blocks access if agency reviewStatus is not 'accepted'
 * - allowOnlyAgencyCompleteProfile: Only allows access if reviewStatus is 'completeProfile'
 */

// Middleware: Allow access only if agency profile is completed
const requireAgencyProfileCompleted = (req, res, next) => {
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

// Middleware: Allow access only if agency reviewStatus is 'accepted'
const requireAgencyReviewAccepted = (req, res, next) => {
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

// Middleware: Allow access only if agency reviewStatus is 'completeProfile' (for profile completion flow)
const allowOnlyAgencyCompleteProfile = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: messages.COMMON.UNAUTHORIZED 
    });
  }

  if (req.user.reviewStatus !== 'completeProfile') {
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

// Helper function to get redirect based on agency review status
const getAgencyRedirectByStatus = (reviewStatus) => {
  const redirectMap = {
    'completeProfile': 'COMPLETE_PROFILE',
    'pending': 'UNDER_REVIEW',
    'accepted': 'DASHBOARD',
    'rejected': 'REJECTED'
  };
  
  return redirectMap[reviewStatus] || 'COMPLETE_PROFILE';
};

module.exports = {
  requireAgencyProfileCompleted,
  requireAgencyReviewAccepted,
  allowOnlyAgencyCompleteProfile,
  getAgencyRedirectByStatus
};