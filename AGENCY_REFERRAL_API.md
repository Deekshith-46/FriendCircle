# Agency Referral API Documentation

## Overview
API endpoints for agencies to view female users who joined using their referral code.

## Base URL
```
/api/v1/agency/referrals
```

## Authentication
All endpoints require agency authentication via Bearer token in Authorization header.

## Endpoints

### 1. Get Referred Female Users
**GET** `/female-users`

Returns a list of female users who joined using the agency's referral code.

#### Response
```json
{
  "success": true,
  "data": {
    "referralCode": "ABC123XYZ",
    "totalReferred": 5,
    "femaleUsers": [
      {
        "id": "67890abcdef1234567890abcd",
        "name": "Sarah Johnson",
        "email": "sarah@example.com",
        "profileImage": "https://storage.googleapis.com/images/xyz123.jpg",
        "reviewStatus": "accepted",
        "isActive": true,
        "joinedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### Response Fields
- `referralCode`: Agency's referral code
- `totalReferred`: Total count of referred female users
- `femaleUsers`: Array of referred users
  - `id`: User ID
  - `name`: User's name
  - `email`: User's email
  - `profileImage`: URL of user's profile image (first image if multiple)
  - `reviewStatus`: Current review status ('completeProfile', 'pending', 'accepted', 'rejected')
  - `isActive`: Whether user account is active
  - `joinedAt`: Timestamp when user joined

### 2. Get Referral Statistics
**GET** `/stats`

Returns referral statistics for the agency.

#### Response
```json
{
  "success": true,
  "data": {
    "femaleUsers": 12,
    "agencies": 3,
    "total": 15
  }
}
```

#### Response Fields
- `femaleUsers`: Count of female users referred
- `agencies`: Count of agencies referred (if applicable)
- `total`: Total referrals

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. Agency authentication required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Agency not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error fetching referred users",
  "error": "Detailed error message"
}
```

## Usage Example

### JavaScript/Fetch
```javascript
const response = await fetch('/api/v1/agency/referrals/female-users', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data.femaleUsers);
```

### cURL
```bash
curl -X GET \
  http://localhost:5001/api/v1/agency/referrals/female-users \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

## Review Status Values
- `completeProfile`: User has completed profile but not reviewed
- `pending`: Profile submitted for review
- `accepted`: Profile approved
- `rejected`: Profile rejected