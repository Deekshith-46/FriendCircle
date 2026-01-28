# Agency User Authentication & Onboarding API Testing Guide

This document provides a step-by-step guide for testing the Agency user authentication and onboarding flow APIs.

## API Base URL
```
http://localhost:3000/agency
```

## 1. Agency Registration

### Endpoint
```
POST /agency/register
```

### Request Body
```json
{
  "email": "agency@example.com",
  "mobileNumber": "9876543210"
}
```

### Expected Response (Success)
```json
{
  "success": true,
  "message": "OTP sent to email",
  "otp": 1234
}
```

### Expected Response (Error - Duplicate Registration)
```json
{
  "success": false,
  "message": "Agency already exists, please login",
  "redirectTo": "LOGIN"
}
```

### Test Steps
1. Make a POST request with a new email and mobile number
2. Verify the response includes success: true and OTP
3. Try registering the same email/mobile again - should return error
4. Test with invalid email format
5. Test with invalid mobile number format

## 2. OTP Verification

### Endpoint
```
POST /agency/verify-otp
```

### Request Body
```json
{
  "otp": 1234
}
```

### Expected Response (Success)
```json
{
  "success": true,
  "token": "jwt_token_here",
  "message": "OTP verified successfully",
  "data": {
    "profileCompleted": false,
    "reviewStatus": "completeProfile",
    "redirectTo": "COMPLETE_PROFILE"
  }
}
```

### Expected Response (Error)
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

### Test Steps
1. Use the OTP received from registration
2. Verify the token is returned
3. Test with invalid OTP
4. Test with expired OTP
5. Verify that reviewStatus is set to "completeProfile"

## 3. Agency Login

### Endpoint
```
POST /agency/login
```

### Request Body
```json
{
  "email": "agency@example.com"
}
```

### Expected Response (Success)
```json
{
  "success": true,
  "message": "OTP sent to email for login",
  "otp": 5678
}
```

### Expected Response (Error - User Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Expected Response (Error - Account Not Verified)
```json
{
  "success": false,
  "message": "Account not verified"
}
```

### Test Steps
1. Login with a verified agency email
2. Verify OTP is sent to the email
3. Try with non-existent email
4. Try with unverified account
5. Try with account that has profile not completed - should still work
6. Try with account that has reviewStatus pending - should still work
7. Try with account that has reviewStatus rejected - should still work (access control happens after login)

## 4. Login OTP Verification

### Endpoint
```
POST /agency/verify-login-otp
```

### Request Body
```json
{
  "otp": 5678
}
```

### Expected Response (Success - Complete Profile State)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "data": {
    "agency": {
      "id": "agency_id",
      "firstName": null,
      "lastName": null,
      "email": "agency@example.com",
      "mobileNumber": "9876543210",
      "profileCompleted": false,
      "reviewStatus": "completeProfile"
    },
    "redirectTo": "COMPLETE_PROFILE"
  }
}
```

### Expected Response (Success - Pending Review State)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "data": {
    "agency": {
      "id": "agency_id",
      "firstName": "Agency",
      "lastName": "Top",
      "email": "agency@example.com",
      "mobileNumber": "9876543210",
      "profileCompleted": true,
      "reviewStatus": "pending"
    },
    "redirectTo": "UNDER_REVIEW"
  }
}
```

### Test Steps
1. Use the OTP received from login
2. Test with different reviewStatus values
3. Verify correct redirectTo based on reviewStatus
4. Test with invalid OTP

## 5. Complete Agency Profile (Details + Image)

### Endpoint
```
POST /agency/complete-profile
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

### Form Data Fields
```
firstName: "Agency"
lastName: "Top"
aadharOrPanNum: "123456789012"
image: [file]
```

### Alternative Form Data (PAN)
```
firstName: "Agency"
lastName: "Top"
aadharOrPanNum: "ABCDE1234F"
image: [file]
```

### Expected Response (Success - Profile Completed)
```json
{
  "success": true,
  "message": "Profile completed and submitted for review",
  "data": {
    "firstName": "Agency",
    "lastName": "Top",
    "aadharOrPanNum": "123456789012",
    "image": "https://example.com/image.jpg",
    "profileCompleted": true,
    "reviewStatus": "pending"
  }
}
```

### Expected Response (Success - Details Only)
```json
{
  "success": true,
  "message": "Agency details saved successfully",
  "data": {
    "firstName": "Agency",
    "lastName": "Top",
    "aadharOrPanNum": "123456789012",
    "image": null,
    "profileCompleted": false,
    "reviewStatus": "completeProfile"
  }
}
```

### Expected Response (Error - Missing Required Fields)
```json
{
  "success": false,
  "message": "First name and last name are required"
}
```

### Expected Response (Error - Missing Aadhar/PAN)
```json
{
  "success": false,
  "message": "Aadhar or PAN number is required"
}
```

### Test Steps
1. Send details with Aadhar number and image
2. Send details with PAN number and image
3. Test with missing firstName/lastName
4. Test with missing aadharOrPanNum
5. Test with profile already completed (should fail)
6. Test with only details and no image
7. Test with only image and no details (should fail validation)
8. Verify that profile completion is triggered when both details and image are present

## 6. Update Agency Profile

### Endpoint
```
PUT /agency/profile
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

### Form Data Fields (all optional, only send fields you want to update)
```
firstName: "UpdatedAgency"
lastName: "UpdatedLast"
aadharOrPanNum: "998877665544"
image: [file]
```

### Expected Response (Success - Profile Completed)
```json
{
  "success": true,
  "message": "Profile completed and submitted for review",
  "data": {
    "firstName": "UpdatedAgency",
    "lastName": "UpdatedLast",
    "aadharOrPanNum": "998877665544",
    "image": "https://example.com/image.jpg",
    "profileCompleted": true,
    "reviewStatus": "pending"
  }
}
```

### Expected Response (Success - Details Updated)
```json
{
  "success": true,
  "message": "Agency details updated successfully",
  "data": {
    "firstName": "UpdatedAgency",
    "lastName": "UpdatedLast",
    "aadharOrPanNum": "998877665544",
    "image": null,
    "profileCompleted": false,
    "reviewStatus": "completeProfile"
  }
}
```

### Test Steps
1. Update only firstName
2. Update only lastName
3. Update only aadharOrPanNum
4. Update with image upload
5. Update with all fields
6. Verify profile completion is triggered when both details and image are present

## 7. Get Agency Profile

### Endpoint
```
GET /agency/me
```

### Headers
```
Authorization: Bearer {jwt_token}
```

### Expected Response (Success)
```json
{
  "success": true,
  "data": {
    "id": "agency_id",
    "email": "agency@example.com",
    "mobileNumber": "9876543210",
    "firstName": "Agency",
    "lastName": "Top",
    "image": "https://example.com/image.jpg",
    "profileCompleted": true,
    "reviewStatus": "pending",
    "isVerified": true,
    "isActive": true
  }
}
```

### Test Steps
1. Get profile after registration
2. Get profile after details are added
3. Get profile after image is uploaded
4. Verify all fields are returned correctly

## Complete Flow Test

### Step 1: Registration
1. Register a new agency with email and mobile
2. Verify OTP received

### Step 2: OTP Verification
1. Verify the OTP from registration
2. Note the token and redirectTo value

### Step 3: Add Agency Details
1. Use the token from step 2
2. Add agency details with firstName, lastName, and either Aadhar or PAN

### Step 4: Upload Image
1. Use the same token
2. Upload an agency image

### Step 5: Verify Profile Completion
1. Check that profileCompleted is now true
2. Check that reviewStatus is now "pending"

### Step 6: Login Again
1. Login with the same email
2. Verify OTP for login
3. Check that redirectTo is "UNDER_REVIEW"

## Error Scenarios to Test

1. **Duplicate Registration**: Register the same email/mobile twice
2. **Invalid OTP**: Try to verify with wrong OTP
3. **Incomplete Profile**: Try to access restricted endpoints before profile completion
4. **Missing Details**: Submit details without required fields
5. **No Aadhar/PAN**: Submit details without either Aadhar or PAN number
6. **Profile Already Completed**: Try to update details after profile completion
7. **Unverified Account**: Try to login with unverified account
8. **Invalid Token**: Use invalid/expired token for protected endpoints

## Status Code Verification

- `200/201`: Successful operations
- `400`: Bad request (validation errors, invalid OTP)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (access denied based on reviewStatus)
- `404`: User not found
- `500`: Internal server error

## Review Status Transitions

1. **Initial State**: `reviewStatus: "completeProfile"`, `profileCompleted: false`
2. **After Details & Image**: `reviewStatus: "pending"`, `profileCompleted: true`
3. **After Admin Acceptance**: `reviewStatus: "accepted"`
4. **After Admin Rejection**: `reviewStatus: "rejected"`

## Expected Redirects

- `completeProfile` → "COMPLETE_PROFILE"
- `pending` → "UNDER_REVIEW"
- `accepted` → "DASHBOARD"
- `rejected` → "REJECTED"