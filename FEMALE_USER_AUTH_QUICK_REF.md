# Female User Auth - Quick Reference Card

## 📌 reviewStatus States

| State | Meaning | User Actions |
|-------|---------|-------------|
| `completeProfile` | Just verified, need to complete profile | Upload images/video, fill profile |
| `pending` | Profile submitted, waiting for admin | Login & see "under review" only |
| `accepted` | Admin approved | Full platform access ✅ |
| `rejected` | Admin rejected | Login & see rejection only ❌ |

---

## 🔑 Key API Endpoints

### Authentication
```
POST /female-user/register           - Sign up (ONCE only)
POST /female-user/verify-otp         - Verify signup OTP
POST /female-user/login              - Send login OTP
POST /female-user/verify-login-otp   - Verify login OTP
```

### Profile Setup
```
POST /female-user/upload-image       - Upload 1-5 images
POST /female-user/upload-video       - Upload video (required)
POST /female-user/complete-profile   - Submit profile data
```

### User Data
```
GET  /female-user/me                 - Get my profile
GET  /female-user/me/balance         - Get wallet/coin balance
GET  /female-user/me/transactions    - Get transaction history
```

### Protected (reviewStatus=accepted)
```
GET  /female-user/browse-males       - Browse male users
POST /female-user/follow             - Follow user
POST /female-user/send-message       - Send message
GET  /female-user/chat-history       - Get messages
```

---

## ✅ Signup Flow (First Time)

```
1. POST /register → OTP sent
2. POST /verify-otp → Token received
3. POST /upload-image → Images uploaded
4. POST /upload-video → Video uploaded
5. POST /complete-profile → Profile submitted
   → reviewStatus = "pending"
6. Admin approves → reviewStatus = "accepted"
7. Login → Full access
```

---

## 🔄 Login Response Examples

### After Profile Completion (Pending Review)
```json
{
  "success": true,
  "token": "...",
  "data": {
    "user": { "reviewStatus": "pending" },
    "redirectTo": "UNDER_REVIEW"  ← Frontend action
  }
}
```

### After Admin Approval
```json
{
  "success": true,
  "token": "...",
  "data": {
    "user": { "reviewStatus": "accepted" },
    "redirectTo": "DASHBOARD"  ← Frontend action
  }
}
```

### If Rejected
```json
{
  "success": true,
  "token": "...",
  "data": {
    "user": { "reviewStatus": "rejected" },
    "redirectTo": "REJECTED"  ← Frontend action
  }
}
```

---

## 🛡️ Access Control

### Middleware Usage
```javascript
// In routes
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');

// Apply to protected routes
router.get('/browse-males', 
  auth,                    // ← Must be logged in
  requireReviewAccepted,   // ← Must be accepted
  controller.listMaleUsers
);
```

### Response When Blocked
```json
{
  "success": false,
  "message": "Your profile is under review. Please wait for admin approval.",
  "redirectTo": "UNDER_REVIEW"
}
```

---

## ❌ Common Errors

### Duplicate Signup
```json
{
  "success": false,
  "message": "User already exists, please login",
  "redirectTo": "LOGIN"
}
```

### Profile Not Complete
```json
{
  "success": false,
  "message": "At least one image is required to complete profile."
}
```

### Access Denied
```json
{
  "success": false,
  "message": "Your profile is under review. Please wait for admin approval.",
  "redirectTo": "UNDER_REVIEW"
}
```

---

## 🔍 Admin Actions

### Approve User
```javascript
POST /admin/users/review-registration
{
  "userType": "female",
  "userId": "...",
  "reviewStatus": "accepted"  // or "rejected"
}
```

---

## 🎯 Frontend Navigation Logic

```javascript
// Handle login response
const handleLoginSuccess = (response) => {
  const { redirectTo } = response.data;
  
  switch (redirectTo) {
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
  }
};
```

---

## 📝 Profile Completion Checklist

Before calling `/complete-profile`:

- [ ] At least 1 image uploaded (max 5)
- [ ] Video uploaded
- [ ] name, age, gender, bio provided
- [ ] (Optional) interests, languages, hobbies, etc.

---

## 🚦 State Progression

```
Sign Up (NEW)
    ↓
Verify OTP → reviewStatus: "completeProfile"
    ↓
Upload Media + Complete Profile → reviewStatus: "pending"
    ↓
Admin Approve → reviewStatus: "accepted" ✅
    OR
Admin Reject → reviewStatus: "rejected" ❌
```

---

## 💡 Important Rules

1. ✅ Signup ONLY ONCE per email/mobile
2. ✅ Login ALWAYS allowed after OTP verification
3. ✅ Platform access ONLY for "accepted" users
4. ✅ Images + Video REQUIRED for profile completion
5. ❌ NO multiple signups
6. ❌ NO delete and recreate
7. ❌ NO login blocking (after initial verification)

---

## 🔧 Environment Variables

```env
JWT_SECRET=your_secret_here
SENDGRID_API_KEY=your_key_here
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

---

## 📞 Support

For questions or issues:
1. Check [FEMALE_USER_AUTH_REDESIGN.md](./FEMALE_USER_AUTH_REDESIGN.md)
2. Check [FEMALE_USER_AUTH_API_TESTING.md](./FEMALE_USER_AUTH_API_TESTING.md)
3. Check [FEMALE_USER_AUTH_FLOW_DIAGRAMS.md](./FEMALE_USER_AUTH_FLOW_DIAGRAMS.md)

---

**Quick Ref Version:** 1.0
**Last Updated:** December 30, 2025
