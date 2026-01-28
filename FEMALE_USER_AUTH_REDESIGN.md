# Female User Authentication & Onboarding Flow - Complete Redesign

## 📋 Overview

This document describes the completely redesigned authentication and onboarding flow for female users. The new system enforces a **single-signup → login-only → gated-access** flow with strict state management.

---

## 🔑 Key Principles

1. **One Signup Per User** - No multiple signups allowed (no delete and recreate)
2. **Login Always Allowed** - After OTP verification, login is always permitted
3. **Access Gated by reviewStatus** - Platform access controlled by admin review
4. **Clear State Progression** - Each state has a specific purpose and UI direction
5. **No Profile Bypass** - Users must complete profile before full access

---

## 📊 User States & Fields

### FemaleUser Model Fields

```javascript
{
  isVerified: Boolean,          // true after signup OTP verification
  isActive: Boolean,            // true after signup OTP verification
  profileCompleted: Boolean,    // true after profile submission
  reviewStatus: Enum            // 'completeProfile' | 'pending' | 'accepted' | 'rejected'
}
```

### State Definitions

| reviewStatus | Meaning | User Can |
|-------------|---------|----------|
| `completeProfile` | Just verified OTP, profile not submitted | Complete profile, upload images/video |
| `pending` | Profile submitted, awaiting admin review | Login and see "under review" message only |
| `accepted` | Admin approved the profile | Full platform access |
| `rejected` | Admin rejected the profile | Login and see rejection message only |

---

## 🔄 Complete Flow

### 1️⃣ SIGN UP (POST `/female-user/register`)

**Request:**
```json
{
  "email": "user@example.com",
  "mobileNumber": "1234567890",
  "referralCode": "ABC123" // optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "otp": "1234" // for testing only
}
```

**If User Already Exists (400):**
```json
{
  "success": false,
  "message": "User already exists, please login",
  "redirectTo": "LOGIN"
}
```

**What Happens:**
- OTP is generated and sent via email
- User record created with:
  - `isVerified: false`
  - `isActive: false`
  - `profileCompleted: false`
  - `reviewStatus: 'completeProfile'`
- If user already exists → **REJECT** signup

---

### 2️⃣ VERIFY OTP (POST `/female-user/verify-otp`)

**Request:**
```json
{
  "otp": "1234"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "message": "OTP verified successfully. Please complete your profile to continue.",
  "data": {
    "profileCompleted": false,
    "reviewStatus": "completeProfile",
    "redirectTo": "COMPLETE_PROFILE"
  }
}
```

**What Happens:**
- `isVerified: true`
- `isActive: true`
- `reviewStatus: 'completeProfile'`
- JWT token generated
- User can now upload images/video and complete profile

---

### 3️⃣ UPLOAD IMAGES (POST `/female-user/upload-image`)

**Request (form-data):**
```
images: [file1, file2, ...] (max 5)
```

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Success Response:**
```json
{
  "success": true,
  "message": "Images uploaded successfully.",
  "data": {
    "added": 2,
    "skipped": 0,
    "totalImages": 2
  }
}
```

**Notes:**
- Maximum 5 images allowed
- Can be called multiple times until limit reached
- Images stored in Cloudinary

---

### 4️⃣ UPLOAD VIDEO (POST `/female-user/upload-video`)

**Request (form-data):**
```
video: file
```

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Success Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully.",
  "data": {
    "url": "https://cloudinary.com/...",
    "secureUrl": "https://cloudinary.com/...",
    "publicId": "abc123",
    "resourceType": "video",
    "duration": 10.5,
    "bytes": 1024000
  }
}
```

---

### 5️⃣ COMPLETE PROFILE (POST `/female-user/complete-profile`)

**Request (JSON):**
```json
{
  "name": "Jane Doe",
  "age": 25,
  "gender": "female",
  "bio": "Hello, I'm Jane!",
  "interests": ["507f1f77bcf86cd799439011", "..."],
  "languages": ["507f1f77bcf86cd799439012", "..."],
  "hobbies": ["Reading", "Traveling"],
  "sports": ["Yoga"],
  "film": ["Drama", "Comedy"],
  "music": ["Pop", "Jazz"],
  "travel": ["Europe", "Asia"]
}
```

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Validations:**
- `name`, `age`, `gender`, `bio` are **required**
- At least 1 image must be uploaded
- Video must be uploaded

**Success Response:**
```json
{
  "success": true,
  "message": "Profile completed successfully! Your account is now pending admin approval.",
  "data": {
    "profileCompleted": true,
    "reviewStatus": "pending",
    "redirectTo": "UNDER_REVIEW"
  }
}
```

**What Happens:**
- `profileCompleted: true`
- `reviewStatus: 'pending'`
- Referral bonus awarded (if applicable)
- User can login but only sees "under review" screen

---

### 6️⃣ LOGIN (POST `/female-user/login`)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email for login verification.",
  "otp": "5678" // for testing
}
```

**Notes:**
- ✅ Login is **ALWAYS ALLOWED** after initial OTP verification
- ❌ No checks for `profileCompleted` or `reviewStatus` during login
- OTP is sent regardless of profile state

---

### 7️⃣ VERIFY LOGIN OTP (POST `/female-user/verify-login-otp`)

**Request:**
```json
{
  "otp": "5678"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "jwt_token_here",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Doe",
      "email": "user@example.com",
      "mobileNumber": "1234567890",
      "profileCompleted": true,
      "reviewStatus": "pending"
    },
    "redirectTo": "UNDER_REVIEW"
  }
}
```

### Redirect Logic Based on reviewStatus

| reviewStatus | redirectTo | Frontend Action |
|-------------|-----------|-----------------|
| `completeProfile` | `COMPLETE_PROFILE` | Show profile completion form |
| `pending` | `UNDER_REVIEW` | Show "Your profile is under review" page |
| `accepted` | `DASHBOARD` | Show full app dashboard |
| `rejected` | `REJECTED` | Show rejection message + support contact |

---

## 🛡️ Access Control Middleware

### New Middleware: `reviewStatusMiddleware.js`

Located at: `src/middlewares/reviewStatusMiddleware.js`

#### Available Middlewares:

1. **`requireProfileCompleted`** - Blocks if profile not completed
2. **`requireReviewAccepted`** - Blocks if reviewStatus ≠ 'accepted'
3. **`allowOnlyCompleteProfile`** - Only allows if reviewStatus = 'completeProfile'

#### Usage Example:

```javascript
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');

// Protected route - only accepted users can access
router.get('/browse-males', auth, requireReviewAccepted, femaleUserController.listMaleUsers);
```

### Routes Access Control

| Route | Auth | Middleware | Access |
|-------|------|-----------|--------|
| `/register` | ❌ | None | Public |
| `/login` | ❌ | None | Public |
| `/verify-otp` | ❌ | None | Public |
| `/verify-login-otp` | ❌ | None | Public |
| `/upload-image` | ✅ | None | Logged in users |
| `/upload-video` | ✅ | None | Logged in users |
| `/complete-profile` | ✅ | None | Logged in users |
| `/me` | ✅ | None | Logged in users |
| `/browse-males` | ✅ | `requireReviewAccepted` | Accepted users only |
| `/follow` | ✅ | `requireReviewAccepted` | Accepted users only |
| `/send-message` | ✅ | `requireReviewAccepted` | Accepted users only |
| All other protected routes | ✅ | `requireReviewAccepted` | Accepted users only |

---

## 👨‍💼 Admin Review Flow

### Review Registration (Admin API)

**Endpoint:** `POST /admin/users/review-registration`

**Request:**
```json
{
  "userType": "female",
  "userId": "507f1f77bcf86cd799439011",
  "reviewStatus": "accepted" // or "rejected"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Jane Doe",
    "reviewStatus": "accepted",
    ...
  }
}
```

**What Happens:**
- If `accepted`: User gets full platform access on next login
- If `rejected`: User can login but only sees rejection screen

---

## 🔒 Hard Rules (CRITICAL)

1. ✅ **Signup allowed ONLY ONCE** per email/mobile
2. ❌ **No deleting and recreating** users
3. ✅ **Login is ALWAYS allowed** after initial OTP verification
4. ✅ **Profile completion enforced** via `reviewStatus`
5. ✅ **Access control driven by** `reviewStatus` only
6. ❌ **No fragmented profile APIs** - one unified API
7. ✅ **Images and video can be uploaded** before profile completion
8. ✅ **Profile submission validates** images + video presence

---

## 📝 Error Messages

### Signup Errors

```json
// User already exists
{
  "success": false,
  "message": "User already exists, please login",
  "redirectTo": "LOGIN"
}

// Invalid email
{
  "success": false,
  "message": "Please provide a valid email address"
}

// Invalid mobile
{
  "success": false,
  "message": "Please provide a valid mobile number"
}
```

### Profile Completion Errors

```json
// Missing required fields
{
  "success": false,
  "message": "Name, age, gender, and bio are required to complete profile."
}

// No images uploaded
{
  "success": false,
  "message": "At least one image is required to complete profile."
}

// No video uploaded
{
  "success": false,
  "message": "A video is required to complete profile."
}

// Profile already completed
{
  "success": false,
  "message": "Profile is already completed."
}
```

### Access Control Errors

```json
// Profile not completed (requireReviewAccepted middleware)
{
  "success": false,
  "message": "Please complete your profile to access the platform.",
  "redirectTo": "COMPLETE_PROFILE"
}

// Under review (requireReviewAccepted middleware)
{
  "success": false,
  "message": "Your profile is under review. Please wait for admin approval.",
  "redirectTo": "UNDER_REVIEW"
}

// Rejected (requireReviewAccepted middleware)
{
  "success": false,
  "message": "Your profile has been rejected. Please contact support for more information.",
  "redirectTo": "REJECTED"
}
```

---

## 🧪 Testing Flow

### Test Case 1: Complete Happy Path

```bash
# 1. Sign up
POST /female-user/register
{
  "email": "test@example.com",
  "mobileNumber": "9876543210"
}
# Expected: OTP sent, user created

# 2. Verify OTP
POST /female-user/verify-otp
{
  "otp": "1234"
}
# Expected: JWT token, redirectTo: COMPLETE_PROFILE

# 3. Upload images
POST /female-user/upload-image
Headers: Authorization: Bearer {token}
Body: form-data with images
# Expected: Images uploaded

# 4. Upload video
POST /female-user/upload-video
Headers: Authorization: Bearer {token}
Body: form-data with video
# Expected: Video uploaded

# 5. Complete profile
POST /female-user/complete-profile
Headers: Authorization: Bearer {token}
{
  "name": "Test User",
  "age": 25,
  "gender": "female",
  "bio": "Test bio"
}
# Expected: Profile completed, redirectTo: UNDER_REVIEW

# 6. Admin approves
POST /admin/users/review-registration
{
  "userType": "female",
  "userId": "{userId}",
  "reviewStatus": "accepted"
}
# Expected: User approved

# 7. Login again
POST /female-user/login
{
  "email": "test@example.com"
}
# Expected: OTP sent

# 8. Verify login OTP
POST /female-user/verify-login-otp
{
  "otp": "5678"
}
# Expected: JWT token, redirectTo: DASHBOARD

# 9. Access protected route
GET /female-user/browse-males
Headers: Authorization: Bearer {token}
# Expected: List of male users
```

### Test Case 2: Duplicate Signup Prevention

```bash
# 1. Sign up (first time)
POST /female-user/register
{
  "email": "test@example.com",
  "mobileNumber": "9876543210"
}
# Expected: Success

# 2. Try to sign up again (same email)
POST /female-user/register
{
  "email": "test@example.com",
  "mobileNumber": "1111111111"
}
# Expected: Error - "User already exists, please login"

# 3. Try to sign up again (same mobile)
POST /female-user/register
{
  "email": "another@example.com",
  "mobileNumber": "9876543210"
}
# Expected: Error - "User already exists, please login"
```

### Test Case 3: Access Control

```bash
# 1. Complete signup and OTP verification (reviewStatus: completeProfile)
# 2. Try to access protected route
GET /female-user/browse-males
Headers: Authorization: Bearer {token}
# Expected: Error - redirectTo: COMPLETE_PROFILE

# 3. Complete profile (reviewStatus: pending)
# 4. Try to access protected route
GET /female-user/browse-males
Headers: Authorization: Bearer {token}
# Expected: Error - redirectTo: UNDER_REVIEW

# 5. Admin approves (reviewStatus: accepted)
# 6. Try to access protected route
GET /female-user/browse-males
Headers: Authorization: Bearer {token}
# Expected: Success - List of male users
```

---

## 📦 Files Modified

### Models
- ✅ `src/models/femaleUser/FemaleUser.js` - Updated reviewStatus enum
- ✅ `src/models/agency/AgencyUser.js` - Updated reviewStatus enum (consistency)

### Controllers
- ✅ `src/controllers/femaleUserControllers/femaleUserController.js` - Complete refactor
- ✅ `src/controllers/femaleUserControllers/statsController.js` - Updated reviewStatus reference
- ✅ `src/controllers/maleUserControllers/maleUserController.js` - Updated reviewStatus reference
- ✅ `src/controllers/agencyControllers/agencyUserController.js` - Updated reviewStatus reference
- ✅ `src/controllers/adminControllers/userManagementController.js` - Updated reviewStatus values

### Middlewares
- ✅ `src/middlewares/reviewStatusMiddleware.js` - **NEW FILE** - Access control

### Routes
- ✅ `src/routes/femaleUserRoutes/femaleUserRoutes.js` - Complete reorganization with middleware

### Utils
- ✅ `src/utils/rewardCalculator.js` - Updated reviewStatus reference

### Validations
- ✅ `src/validations/messages.js` - Updated messages

---

## 🎯 Frontend Integration Guide

### State Management Recommendations

```javascript
// Store user state
const userState = {
  isAuthenticated: false,
  token: null,
  user: null,
  reviewStatus: null,
  redirectTo: null
};

// After login OTP verification
const handleLoginOtpVerification = (response) => {
  userState.isAuthenticated = true;
  userState.token = response.token;
  userState.user = response.data.user;
  userState.reviewStatus = response.data.user.reviewStatus;
  userState.redirectTo = response.data.redirectTo;
  
  // Navigate based on redirectTo
  switch (userState.redirectTo) {
    case 'COMPLETE_PROFILE':
      navigate('/complete-profile');
      break;
    case 'UNDER_REVIEW':
      navigate('/under-review');
      break;
    case 'DASHBOARD':
      navigate('/dashboard');
      break;
    case 'REJECTED':
      navigate('/rejected');
      break;
    default:
      navigate('/');
  }
};
```

### Route Guards

```javascript
// Protect routes based on reviewStatus
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, reviewStatus } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (reviewStatus !== 'accepted') {
    // Redirect based on status
    if (reviewStatus === 'completeProfile') {
      return <Navigate to="/complete-profile" />;
    } else if (reviewStatus === 'pending') {
      return <Navigate to="/under-review" />;
    } else if (reviewStatus === 'rejected') {
      return <Navigate to="/rejected" />;
    }
  }
  
  return children;
};
```

---

## ✅ Summary

This redesign implements a **clean, controlled, production-ready** authentication and onboarding flow with:

- ✅ Single signup enforcement
- ✅ Login always permitted (after initial verification)
- ✅ Gated access via reviewStatus
- ✅ Clear state progression
- ✅ Unified profile completion API
- ✅ Comprehensive access control middleware
- ✅ Admin review workflow
- ✅ Proper error messages and redirects
- ✅ Frontend integration support

**The system is ready for production deployment.**
