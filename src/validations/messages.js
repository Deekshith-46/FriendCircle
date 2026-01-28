module.exports = {
  COMMON: {
    SERVER_ERROR: "Something went wrong",
    USER_NOT_FOUND: "User not found",
    MALE_USER_NOT_FOUND: "Male User not found",
    FEMALE_USER_NOT_FOUND: "Female User not found",
    INVALID_EMAIL: "Please provide a valid email address",
    EMAIL_OR_OTP_REQUIRED: "Email or OTP is required",
    INVALID_OTP: "Invalid OTP",
    UNAUTHORIZED: "Not authorized"
  },

  AUTH: {
    OTP_SENT_EMAIL: "OTP sent to your email",
    OTP_SENT_LOGIN: "OTP sent to your email for login verification.",
    OTP_VERIFIED: "OTP verified successfully. Please complete your profile to continue.",
    LOGIN_SUCCESS: "Login successful.",
    ACCOUNT_NOT_VERIFIED: "Please verify your account first.",
    ACCOUNT_DEACTIVATED: "Your account has been deactivated by admin or staff.",
    USER_ALREADY_EXISTS: "User already exists. Please login instead.",
    USER_ALREADY_EXISTS_LOGIN: "User already exists, please login"
  },

  PROFILE: {
    INTEREST_REQUIRED: "Interest IDs array is required",
    LANGUAGE_REQUIRED: "Language IDs array is required",
    HOBBIES_REQUIRED: "Hobbies array is required",
    SPORTS_REQUIRED: "Sports array is required",
    FILM_REQUIRED: "Film preferences array is required",
    MUSIC_REQUIRED: "Music preferences array is required",
    TRAVEL_REQUIRED: "Travel preferences array is required",
    PROFILE_FETCHED: "Profile fetched successfully"
  },

  IMAGE: {
    NO_IMAGES: "No images uploaded.",
    IMAGE_DELETED: "Image deleted successfully",
    IMAGE_UPLOAD_SUCCESS: "Images uploaded successfully."
  },

  COINS: {
    COINS_ADDED: (coins) => `Coins added: ${coins}`
  },

  WITHDRAWAL: {
    MIN_WITHDRAWAL_AMOUNT: (amount) => `Minimum withdrawal amount is ₹${amount}`,
    INSUFFICIENT_BALANCE: (balanceType) => `Insufficient ${balanceType} balance`,
    WITHDRAWAL_SUCCESS: "Withdrawal request created successfully. Your payment will be credited in 24 hours.",
    WITHDRAWAL_REJECTED: "Withdrawal rejected successfully",
    WITHDRAWAL_APPROVED: "Withdrawal approved successfully (Razorpay integration temporarily bypassed)"
  },

  VALIDATION: {
    INVALID_MOBILE: "Please provide a valid mobile number",
    INVALID_COIN_AMOUNT: "Invalid coin amount",
    INVALID_RUPEE_AMOUNT: "Invalid rupee amount",
    INVALID_PAYOUT_METHOD: "Invalid payout method",
    KYC_NOT_APPROVED: (userType) => `KYC not approved for ${userType} user`, // Note: This message is kept for compatibility but now refers to 'accepted' status
    BANK_DETAILS_NOT_VERIFIED: "Bank details not verified in KYC",
    UPI_DETAILS_NOT_VERIFIED: "UPI details not verified in KYC",
    PAYOUT_DETAILS_REQUIRED: "Payout details required",
    AMOUNT_REQUIRED: "Either coins or rupees amount is required (not both)"
  },

  PAYMENT: {
    INVALID_AMOUNT: "Invalid amount",
    RAZORPAY_NOT_CONFIGURED: "Razorpay not configured",
    INVALID_PACKAGE: "Invalid package",
    PAYMENT_VERIFIED: "Payment verified successfully"
  },

  REGISTRATION: {
    PROFILE_NOT_COMPLETED: "Please complete your profile to access the platform.",
    REGISTRATION_UNDER_REVIEW: "Your profile is under review. Please wait for admin approval.",
    REGISTRATION_REJECTED: "Your profile has been rejected. Please contact support for more information.",
    PROFILE_COMPLETED: "Profile is already completed.",
    PROFILE_REQUIRED_FIELDS: "Name, age, gender, and bio are required to complete profile.",
    PROFILE_MIN_IMAGES: "At least one image is required to complete profile.",
    PROFILE_VIDEO_REQUIRED: "A video is required to complete profile.",
    PROFILE_COMPLETED_SUCCESS: "Profile completed successfully! Your account is now pending admin approval.",
    IMAGE_LIMIT_REACHED: "Image limit reached. Maximum 5 images allowed."
  },

  NOTIFICATION: {
    NO_VIDEO_UPLOADED: "No video uploaded.",
    VIDEO_UPLOADED_SUCCESS: "Video uploaded successfully."
  },

  USER: {
    USER_DELETED: "User account deleted successfully.",
    IMAGE_NOT_FOUND: "Image not found",
    NOT_AUTHORIZED_DELETE_IMAGE: "Not authorized to delete this image",
    STATUS_UPDATED: (status) => `Status updated to ${status ? 'online' : 'offline'}`,
    ONLINE_MINUTES: (minutes) => `Online for ${minutes} minutes`
  },

  STAFF: {
    EMAIL_REQUIRED: "Email is required",
    PASSWORD_REQUIRED: "Password is required",
    EMAIL_PASSWORD_REQUIRED: "Email and password are required.",
    STAFF_EMAIL_EXISTS: "Staff email already exists.",
    STAFF_NOT_FOUND: "Staff not found",
    STAFF_DELETED: "Staff deleted."
  },

  ADMIN: {
    INVALID_CREDENTIALS: "Invalid credentials",
    INVALID_CREDENTIALS_STAFF: "Invalid credentials or staff not active",
    INVALID_USER_TYPE: "Invalid user type",
    MIN_CALL_COINS_REQUIRED: "minCallCoins is required",
    MIN_CALL_COINS_INVALID: "minCallCoins must be a valid non-negative number",
    MIN_CALL_COINS_UPDATED: "Minimum call coins setting updated successfully",
    CONVERSION_RATE_REQUIRED: "coinToRupeeConversionRate is required",
    CONVERSION_RATE_INVALID: "coinToRupeeConversionRate must be a valid positive number",
    CONVERSION_RATE_UPDATED: "Coin to rupee conversion rate updated successfully",
    MIN_WITHDRAWAL_REQUIRED: "minWithdrawalAmount is required",
    MIN_WITHDRAWAL_INVALID: "minWithdrawalAmount must be a valid positive number",
    MIN_WITHDRAWAL_UPDATED: "Minimum withdrawal amount updated successfully",
    BONUS_REQUIRED: "bonus is required",
    BONUS_INVALID: "bonus must be a valid non-negative number",
    BONUS_UPDATED: "Referral bonus updated",
    BONUS_RESET: "Referral bonus reset to default value",
  },

  PERMISSION: {
    NO_ACCESS_MODULE: (module) => `No access to ${module} module`,
    NO_PERMISSION_ACTION: (action, module) => `No ${action} permission for ${module} module`,
    UNAUTHORIZED: "Unauthorized"
  },

  FOLLOW: {
    ALREADY_FOLLOWING: "Already following this user.",
    NOT_FOLLOWER: "This user is not following you.",
    BLOCKED_CANNOT_FOLLOW: "Cannot follow this user. You have blocked them. Please unblock first to follow.",
    FOLLOW_SUCCESS: "Following male user successfully.",
    UNFOLLOW_SUCCESS: "Unfollowed male user successfully.",
    AUTHENTICATION_REQUIRED: "Authentication required."
  },

  AUTH_MIDDLEWARE: {
    NOT_AUTHORIZED: "Not authorized",
    INVALID_TOKEN: "Invalid token",
    USER_NOT_FOUND: "User not found"
  },

  CALL: {
    RECEIVER_REQUIRED: "receiverId is required",
    CALLER_NOT_FOUND: "Caller not found",
    RECEIVER_NOT_FOUND: "Receiver not found",
    FOLLOW_EACH_OTHER: "Both users must follow each other to start a call",
    BLOCKED_CANNOT_CALL: "Either user has blocked the other, cannot start call",
    MIN_COINS_REQUIRED: (minCallCoins) => `Minimum ${minCallCoins} coins required to start a call`,
    NOT_ENOUGH_COINS: "Not enough coins to start call",
    CALL_CAN_START: "Call can be started",
    DURATION_REQUIRED: "receiverId and duration are required",
    DURATION_NEGATIVE: "Duration cannot be negative",
    CALL_NO_CHARGES: "Call ended (no charges for 0 duration)",
    INSUFFICIENT_COINS: "Insufficient coins",
    CALL_ENDED_SUCCESS: "Call ended successfully"
  },

  USER_MANAGEMENT: {
    USER_REFERENCES_CLEANED: "User references cleaned up successfully",
    INVALID_USER_TYPE: "Invalid userType",
    INVALID_USER_KYC_TYPE: "Invalid kycType",
    INVALID_STATUS: "Invalid status",
    INVALID_OPERATION_TYPE: "Invalid operationType",
    INVALID_ACTION: "Invalid action",
    INVALID_AMOUNT: "Invalid amount",
    INSUFFICIENT_BALANCE: "Insufficient balance",
    BALANCE_CREDITED: "Balance credited",
    BALANCE_DEBITED: "Balance debited",
    INVALID_REVIEW_STATUS: "Invalid reviewStatus",
    FEMALE_KYC_NOT_FOUND: "Female KYC not found",
    AGENCY_KYC_NOT_FOUND: "Agency KYC not found",
    USER_DELETED_SUCCESS: (userType) => `${userType} user deleted successfully`,
    CALL_RATE_UPDATED: (name, email) => `Call rate updated successfully for ${name || email}`,
    CALL_RATES_UPDATED: (name, email) => `Call rates updated successfully for ${name || email}`,
    USER_ID_REQUIRED: "userId is required",
    COINS_PER_SECOND_REQUIRED: "coinsPerSecond is required",
    COINS_PER_SECOND_INVALID: "coinsPerSecond must be a valid non-negative number"
  },

  BLOCK: {
    BLOCKED_CANNOT_INTERACT: "Blocked users cannot interact with each other."
  },

  FEMALE_USER: {
    TRAVEL_UPDATED_SUCCESS: "Travel preferences updated successfully",
    INTERESTS_UPDATED_SUCCESS: "Interests updated successfully",
    LANGUAGES_UPDATED_SUCCESS: "Languages updated successfully",
    HOBBIES_UPDATED_SUCCESS: "Hobbies updated successfully",
    SPORTS_UPDATED_SUCCESS: "Sports updated successfully",
    FILM_UPDATED_SUCCESS: "Film preferences updated successfully"
  },

  AGENCY: {
    KYC_SUBMITTED: "KYC submitted for verification."
  }
};