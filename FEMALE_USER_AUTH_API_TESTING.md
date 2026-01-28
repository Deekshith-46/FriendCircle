# Female User Authentication - API Testing Examples

## 🧪 Postman/Thunder Client Test Collection

### 1. SIGN UP

```http
POST {{baseUrl}}/female-user/register
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "mobileNumber": "9876543210",
  "referralCode": "FRIEND123"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "otp": "1234"
}
```

---

### 2. VERIFY SIGNUP OTP

```http
POST {{baseUrl}}/female-user/verify-otp
Content-Type: application/json

{
  "otp": "1234"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "OTP verified successfully. Please complete your profile to continue.",
  "data": {
    "profileCompleted": false,
    "reviewStatus": "completeProfile",
    "redirectTo": "COMPLETE_PROFILE"
  }
}
```

**Save the token for subsequent requests!**

---

### 3. UPLOAD IMAGES

```http
POST {{baseUrl}}/female-user/upload-image
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

images: [file1, file2, file3]
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Images uploaded successfully.",
  "data": {
    "added": 3,
    "skipped": 0,
    "totalImages": 3
  }
}
```

---

### 4. UPLOAD VIDEO

```http
POST {{baseUrl}}/female-user/upload-video
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

video: video_file.mp4
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Video uploaded successfully.",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "secureUrl": "https://res.cloudinary.com/...",
    "publicId": "abc123def456",
    "resourceType": "video",
    "duration": 10.5,
    "bytes": 2048576
  }
}
```

---

### 5. COMPLETE PROFILE (UNIFIED API - All in One Request)

**Option 1: Upload Everything Together (Recommended)**

```http
POST {{baseUrl}}/female-user/complete-profile
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

images: [file1.jpg, file2.jpg, file3.jpg]
video: intro_video.mp4
name: Jane Doe
age: 25
gender: female
bio: Hi, I'm Jane! I love traveling and photography.
interests: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
languages: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"]
hobbies: [{"id": "h1", "name": "Photography"}, {"id": "h2", "name": "Traveling"}]
sports: [{"id": "s1", "name": "Yoga"}, {"id": "s2", "name": "Swimming"}]
film: [{"id": "f1", "name": "Drama"}, {"id": "f2", "name": "Comedy"}]
music: [{"id": "m1", "name": "Pop"}, {"id": "m2", "name": "Jazz"}]
travel: [{"id": "t1", "name": "Europe"}, {"id": "t2", "name": "Asia"}]
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Profile completed successfully! Your account is now pending admin approval.",
  "data": {
    "profileCompleted": true,
    "reviewStatus": "pending",
    "redirectTo": "UNDER_REVIEW",
    "uploadedImages": 3,
    "uploadedVideo": true
  }
}
```

**Option 2: Upload Separately First (Legacy Support)**

If you already uploaded images and video using separate endpoints, you can complete profile with just data:

```http
POST {{baseUrl}}/female-user/complete-profile
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

name: Jane Doe
age: 25
gender: female
bio: Hi, I'm Jane!
interests: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
languages: ["507f1f77bcf86cd799439013"]
hobbies: [{"id": "h1", "name": "Reading"}]
sports: [{"id": "s1", "name": "Tennis"}]
film: [{"id": "f1", "name": "Thriller"}]
music: [{"id": "m1", "name": "Classical"}]
travel: [{"id": "t1", "name": "South America"}]
```

---

### 6. LOGIN (After Profile Completion)

```http
POST {{baseUrl}}/female-user/login
Content-Type: application/json

{
  "email": "jane.doe@example.com"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to your email for login verification.",
  "otp": "5678"
}
```

---

### 7. VERIFY LOGIN OTP

```http
POST {{baseUrl}}/female-user/verify-login-otp
Content-Type: application/json

{
  "otp": "5678"
}
```

**Expected Response (200) - When reviewStatus = 'pending':**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "mobileNumber": "9876543210",
      "profileCompleted": true,
      "reviewStatus": "pending"
    },
    "redirectTo": "UNDER_REVIEW"
  }
}
```

**Expected Response (200) - When reviewStatus = 'accepted':**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "mobileNumber": "9876543210",
      "profileCompleted": true,
      "reviewStatus": "accepted"
    },
    "redirectTo": "DASHBOARD"
  }
}
```

---

### 8. GET MY PROFILE

```http
GET {{baseUrl}}/female-user/me
Authorization: Bearer {{token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "jane.doe@example.com",
    "mobileNumber": "9876543210",
    "name": "Jane Doe",
    "age": 25,
    "gender": "female",
    "bio": "Hi, I'm Jane! I love traveling and photography.",
    "images": [...],
    "videoUrl": "https://res.cloudinary.com/...",
    "interests": [...],
    "languages": [...],
    "hobbies": [
      { "id": "h1", "name": "Photography" },
      { "id": "h2", "name": "Traveling" },
      { "id": "h3", "name": "Reading" }
    ],
    "sports": [
      { "id": "s1", "name": "Yoga" },
      { "id": "s2", "name": "Swimming" }
    ],
    "film": [
      { "id": "f1", "name": "Drama" },
      { "id": "f2", "name": "Comedy" },
      { "id": "f3", "name": "Thriller" }
    ],
    "music": [
      { "id": "m1", "name": "Pop" },
      { "id": "m2", "name": "Jazz" },
      { "id": "m3", "name": "Classical" }
    ],
    "travel": [
      { "id": "t1", "name": "Europe" },
      { "id": "t2", "name": "Asia" },
      { "id": "t3", "name": "South America" }
    ],
    "status": "active",
    "reviewStatus": "pending",
    "isVerified": true,
    "isActive": true,
    "profileCompleted": true,
    "walletBalance": 100,
    "coinBalance": 0,
    "referralCode": "JANE123",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 9. TRY TO ACCESS PROTECTED ROUTE (Before Admin Approval)

```http
GET {{baseUrl}}/female-user/browse-males
Authorization: Bearer {{token}}
```

**Expected Response (403) - When reviewStatus = 'pending':**
```json
{
  "success": false,
  "message": "Your profile is under review. Please wait for admin approval.",
  "redirectTo": "UNDER_REVIEW"
}
```

**Expected Response (403) - When reviewStatus = 'completeProfile':**
```json
{
  "success": false,
  "message": "Please complete your profile to access the platform.",
  "redirectTo": "COMPLETE_PROFILE"
}
```

**Expected Response (403) - When reviewStatus = 'rejected':**
```json
{
  "success": false,
  "message": "Your profile has been rejected. Please contact support for more information.",
  "redirectTo": "REJECTED"
}
```

---

### 10. ADMIN: APPROVE USER

```http
POST {{baseUrl}}/admin/users/review-registration
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "userType": "female",
  "userId": "507f1f77bcf86cd799439011",
  "reviewStatus": "accepted"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "jane.doe@example.com",
    "name": "Jane Doe",
    "reviewStatus": "accepted",
    ...
  }
}
```

---

### 11. ACCESS PROTECTED ROUTE (After Admin Approval)

```http
GET {{baseUrl}}/female-user/browse-males
Authorization: Bearer {{token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "page": 1,
  "limit": 10,
  "total": 25,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "firstName": "John",
      "lastName": "Smith",
      "age": 28,
      "bio": "Hello, I'm John",
      "avatarUrl": "https://res.cloudinary.com/..."
    },
    ...
  ]
}
```

---

## 📝 Profile Update APIs (After Approval)

### 12. UPDATE PROFILE DETAILS (Partial Update)

```http
PATCH {{baseUrl}}/female-user/update-profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Jane Smith",
  "bio": "Updated bio text",
  "interests": ["507f1f77bcf86cd799439015"],
  "languages": ["507f1f77bcf86cd799439016"]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Jane Smith",
    "bio": "Updated bio text",
    "interests": [
      { "_id": "507f1f77bcf86cd799439015", "title": "Music" }
    ],
    "languages": [
      { "_id": "507f1f77bcf86cd799439016", "title": "Spanish" }
    ]
  }
}
```

---

### 13. ADD PREFERENCES (Appends to Existing)

```http
PATCH {{baseUrl}}/female-user/update-profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "travel": [
    { "id": "t4", "name": "Africa" },
    { "id": "t5", "name": "Australia" }
  ]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "travel": [
      { "id": "t1", "name": "Europe" },
      { "id": "t2", "name": "Asia" },
      { "id": "t3", "name": "South America" },
      { "id": "t4", "name": "Africa" },
      { "id": "t5", "name": "Australia" }
    ]
  }
}
```

**Note:** New items are **appended**, not replaced. Duplicates (by ID) are skipped.

---

### 14. DELETE PREFERENCE ITEM

```http
DELETE {{baseUrl}}/female-user/preferences/travel/t4
Authorization: Bearer {{token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "travel item deleted successfully",
  "data": {
    "type": "travel",
    "deletedItemId": "t4",
    "remaining": [
      { "id": "t1", "name": "Europe" },
      { "id": "t2", "name": "Asia" },
      { "id": "t3", "name": "South America" },
      { "id": "t5", "name": "Australia" }
    ]
  }
}
```

**Supported types:** `hobbies`, `sports`, `film`, `music`, `travel`

---

### 15. ADD MORE IMAGES

```http
POST {{baseUrl}}/female-user/add-images
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

images: [file4.jpg, file5.jpg]
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Images uploaded successfully.",
  "data": {
    "added": 2,
    "skipped": 0,
    "totalImages": 5,
    "images": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "imageUrl": "https://res.cloudinary.com/..."
      },
      ...
    ]
  }
}
```

**Note:** Maximum 5 images total. Excess images will be skipped.

---

### 16. DELETE SPECIFIC IMAGE

```http
DELETE {{baseUrl}}/female-user/images/507f1f77bcf86cd799439020
Authorization: Bearer {{token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "deletedImageId": "507f1f77bcf86cd799439020",
    "remainingImages": 4,
    "images": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "imageUrl": "https://res.cloudinary.com/..."
      },
      ...
    ]
  }
}
```

---

### 17. UPDATE VIDEO

```http
PATCH {{baseUrl}}/female-user/update-video
Authorization: Bearer {{token}}
Content-Type: multipart/form-data

video: new_video.mp4
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Video uploaded successfully.",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "secureUrl": "https://res.cloudinary.com/...",
    "publicId": "xyz789abc456",
    "resourceType": "video",
    "duration": 12.3,
    "bytes": 3145728,
    "replacedOldVideo": true
  }
}
```

---

### 18. DELETE VIDEO

```http
DELETE {{baseUrl}}/female-user/video
Authorization: Bearer {{token}}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Video deleted successfully",
  "data": {
    "deletedVideoUrl": "https://res.cloudinary.com/...",
    "hasVideo": false
  }
}
```

---

## 🔄 Error Scenarios

### Duplicate Signup

```http
POST {{baseUrl}}/female-user/register
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "mobileNumber": "9876543210"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "User already exists, please login",
  "redirectTo": "LOGIN"
}
```

---

### Profile Completion Without Images

```http
POST {{baseUrl}}/female-user/complete-profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Jane Doe",
  "age": 25,
  "gender": "female",
  "bio": "Hi!"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "At least one image is required to complete profile."
}
```

---

### Profile Completion Without Video

```http
POST {{baseUrl}}/female-user/complete-profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Jane Doe",
  "age": 25,
  "gender": "female",
  "bio": "Hi!"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "A video is required to complete profile."
}
```

---

### Invalid OTP

```http
POST {{baseUrl}}/female-user/verify-otp
Content-Type: application/json

{
  "otp": "0000"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

---

## 📝 Postman Environment Variables

Create a Postman environment with these variables:

```json
{
  "baseUrl": "http://localhost:3000",
  "token": "",
  "adminToken": "",
  "userId": ""
}
```

After each authentication step, save the token:

```javascript
// In Postman Tests tab
if (pm.response.code === 200) {
  const response = pm.response.json();
  if (response.token) {
    pm.environment.set("token", response.token);
  }
  if (response.data && response.data.user && response.data.user.id) {
    pm.environment.set("userId", response.data.user.id);
  }
}
```

---

## ✅ Complete Test Sequence

### Phase 1: Registration & Profile Completion
1. ✅ Sign up with new email/mobile
2. ✅ Verify OTP → Get JWT token
3. ✅ Complete profile with images + video + data (unified API) → reviewStatus becomes 'pending'
4. ✅ Try to access protected route → Should be blocked (403)
5. ✅ Login again → Still get 'pending' status

### Phase 2: Admin Approval
6. ✅ Admin approves user → reviewStatus becomes 'accepted'
7. ✅ Login again → Get 'accepted' status, redirectTo = 'DASHBOARD'
8. ✅ Access protected routes → Should work (200)

### Phase 3: Profile Updates (After Approval)
9. ✅ Update profile details (name, bio) → Only specified fields change
10. ✅ Add new travel preferences → Appends to existing list
11. ✅ Delete a travel preference → Removes specific item
12. ✅ Add more images (up to 5 total) → Images get added
13. ✅ Delete specific image → Image removed from profile
14. ✅ Update video → Old video replaced with new one
15. ✅ Delete video → Video removed from profile

---

## 🚫 Negative Test Cases

### Registration & Profile Completion
1. ❌ Try to sign up twice with same email → Should fail
2. ❌ Try to sign up twice with same mobile → Should fail
3. ❌ Complete profile without images → Should fail
4. ❌ Complete profile without video → Should fail
5. ❌ Verify OTP with wrong code → Should fail

### Access Control
6. ❌ Access protected routes with 'pending' status → Should fail (403)
7. ❌ Access protected routes with 'rejected' status → Should fail (403)
8. ❌ Access protected routes with 'completeProfile' status → Should fail (403)
9. ❌ Use invalid/expired token → Should fail (401)

### Profile Updates
10. ❌ Try to add 6th image when 5 already exist → Should skip excess
11. ❌ Try to delete someone else's image → Should fail (403)
12. ❌ Try to update profile without being approved → Should fail (403)
13. ❌ Try to delete non-existent preference item → Should fail (404)
14. ❌ Send invalid preference type → Should fail (400)

---

**Happy Testing! 🎉**
