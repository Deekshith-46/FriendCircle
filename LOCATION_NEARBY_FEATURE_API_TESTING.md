# Location & Nearby Feature API Testing Guide

## Overview
Complete API testing guide for the location-based nearby feature with admin distance configuration, male/female location management, and male dashboard sections.

## API Endpoints

### 1. Admin Configuration APIs

#### Update Nearby Distance
- **Endpoint**: `POST /api/admin/config/nearby-distance`
- **Auth**: Admin JWT token required
- **Headers**: `Authorization: Bearer <admin_token>`
- **Body**:
```json
{
  "distanceValue": 5,
  "distanceUnit": "km"
}
```
- **Validation**:
  - `distanceValue` must be a positive number
  - `distanceUnit` must be "meters", "km", or "miles"

#### Get Nearby Distance
- **Endpoint**: `GET /api/admin/config/nearby-distance`
- **Auth**: Admin JWT token required
- **Headers**: `Authorization: Bearer <admin_token>`
- **Response**:
```json
{
  "success": true,
  "data": {
    "distanceValue": 5,
    "distanceUnit": "km"
  }
}
```

### 2. User Location APIs

#### Update Female User Location
- **Endpoint**: `PATCH /api/female-user/location`
- **Auth**: Female user JWT token required
- **Headers**: `Authorization: Bearer <female_token>`
- **Body**:
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946
}
```
- **Validation**:
  - `latitude` must be between -90 and 90
  - `longitude` must be between -180 and 180

#### Update Male User Location (Separate Endpoint)
- **Endpoint**: `PATCH /api/male-user/location`
- **Auth**: Male user JWT token required
- **Headers**: `Authorization: Bearer <male_token>`
- **Body**:
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946
}
```
- **Validation**:
  - `latitude` must be between -90 and 90
  - `longitude` must be between -180 and 180

#### Update Male User Profile with Location (Form Data)
- **Endpoint**: `PUT /api/male-user/profile`
- **Auth**: Male user JWT token required
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "profileCompleted": true
}
```
- **OR using Form Data via profile-and-image endpoint**:
- **Endpoint**: `PUT /api/male-user/profile-and-image`
- **Auth**: Male user JWT token required
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `latitude`: 12.9716
  - `longitude`: 77.5946
  - `profileCompleted`: true
  - Other profile fields as needed

### 3. Male Dashboard APIs

#### Get Dashboard Sections
- **Endpoint**: `GET /api/male-user/dashboard?section=nearby&page=1&limit=10`
- **Auth**: Male user JWT token required
- **Headers**: `Authorization: Bearer <male_token>`
- **Query Parameters**:
  - `section`: "all", "nearby", "followed", or "new"
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)

## Complete Testing Flow

### Phase 1: Admin Setup

#### Test 1: Admin Sets Nearby Distance
1. **Objective**: Verify admin can set nearby distance configuration
2. **Setup**: Admin JWT token ready
3. **Steps**:
   - Send POST request to `/api/admin/config/nearby-distance`
   - Include valid distanceValue and distanceUnit in body
4. **Expected Result**: Success response with updated configuration
5. **Sample Request**:
```bash
curl -X POST "http://localhost:3000/api/admin/config/nearby-distance" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "distanceValue": 5,
    "distanceUnit": "km"
  }'
```
6. **Expected Response**:
```json
{
  "success": true,
  "message": "Nearby distance updated successfully",
  "data": {
    "distanceValue": 5,
    "distanceUnit": "km"
  }
}
```

#### Test 2: Admin Gets Nearby Distance
1. **Objective**: Verify admin can retrieve current nearby distance
2. **Setup**: Admin JWT token ready
3. **Steps**:
   - Send GET request to `/api/admin/config/nearby-distance`
4. **Expected Result**: Success response with current configuration
5. **Sample Request**:
```bash
curl -X GET "http://localhost:3000/api/admin/config/nearby-distance" \
  -H "Authorization: Bearer <admin_token>"
```
6. **Expected Response**:
```json
{
  "success": true,
  "data": {
    "distanceValue": 5,
    "distanceUnit": "km"
  }
}
```

### Phase 2: User Profile Completion with Location

#### Test 3: Female User Completes Profile with Location
1. **Objective**: Verify female user can complete profile only with location
2. **Setup**: Female user JWT token ready
3. **Steps**:
   - Send POST request to `/api/female-user/complete-profile`
   - Include all required profile fields + latitude and longitude
4. **Expected Result**: Profile completed successfully with location saved
5. **Sample Request**:
```bash
curl -X POST "http://localhost:3000/api/female-user/complete-profile" \
  -H "Authorization: Bearer <female_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Jane Doe" \
  -F "age=25" \
  -F "gender=female" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "video=@path/to/video.mp4" \
  -F "images=@path/to/image1.jpg" \
  -F "images=@path/to/image2.jpg"
```
6. **Expected Response**:
```json
{
  "success": true,
  "message": "Profile completed successfully",
  "data": {
    "profileCompleted": true,
    "reviewStatus": "pending"
  }
}
```

#### Test 4: Female User Profile Completion Without Location (Should Fail)
1. **Objective**: Verify profile completion fails without location
2. **Setup**: Female user JWT token ready
3. **Steps**:
   - Send POST request to `/api/female-user/complete-profile`
   - Include all required profile fields EXCEPT latitude and longitude
4. **Expected Result**: Error response requiring location
5. **Sample Request**:
```bash
curl -X POST "http://localhost:3000/api/female-user/complete-profile" \
  -H "Authorization: Bearer <female_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "name=Jane Doe" \
  -F "age=25" \
  -F "gender=female" \
  -F "video=@path/to/video.mp4" \
  -F "images=@path/to/image1.jpg"
```
6. **Expected Response**:
```json
{
  "success": false,
  "message": "Latitude and longitude are required for profile completion"
}
```

#### Test 5: Male User Completes Profile with Location (JSON)
1. **Objective**: Verify male user can complete profile only with location using JSON
2. **Setup**: Male user JWT token ready
3. **Steps**:
   - Send PUT request to `/api/male-user/profile`
   - Include profileCompleted=true and latitude/longitude
4. **Expected Result**: Profile completed successfully with location saved
5. **Sample Request**:
```bash
curl -X PUT "http://localhost:3000/api/male-user/profile" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "profileCompleted": true,
    "latitude": 12.9716,
    "longitude": 77.5946
  }'
```
6. **Expected Response**:
```json
{
  "success": true,
  "message": "Profile details updated successfully",
  "data": {
    "profileCompleted": true,
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

#### Test 5B: Male User Completes Profile with Location (Form Data)
1. **Objective**: Verify male user can complete profile with location using form data via profile-and-image endpoint
2. **Setup**: Male user JWT token ready
3. **Steps**:
   - Send PUT request to `/api/male-user/profile-and-image`
   - Include profileCompleted=true and latitude/longitude as form fields
4. **Expected Result**: Profile completed successfully with location saved
5. **Sample Request**:
```bash
curl -X PUT "http://localhost:3000/api/male-user/profile-and-image" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "profileCompleted=true" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946"
```
6. **Expected Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profileCompleted": true,
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

#### Test 5C: Male User Sets Location During First-Time Profile Entry (Form Data)
1. **Objective**: Verify male user can set location during first-time profile entry without marking as completed
2. **Setup**: Male user JWT token ready
3. **Steps**:
   - Send POST request to `/api/male-user/profile-and-image`
   - Include latitude/longitude as form fields (but NOT profileCompleted)
4. **Expected Result**: Location saved successfully, profileCompleted remains false
5. **Sample Request**:
```bash
curl -X POST "http://localhost:3000/api/male-user/profile-and-image" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: multipart/form-data" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "mobileNumber=9999999999" \
  -F "dateOfBirth=2000-01-01" \
  -F "gender=male"
```
6. **Expected Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profileCompleted": false,
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

### Phase 3: Location Updates

#### Test 6: Female User Updates Location
1. **Objective**: Verify female user can update location after profile completion
2. **Setup**: Female user JWT token ready
3. **Steps**:
   - Send PATCH request to `/api/female-user/location`
   - Include new latitude and longitude
4. **Expected Result**: Location updated successfully
5. **Sample Request**:
```bash
curl -X PATCH "http://localhost:3000/api/female-user/location" \
  -H "Authorization: Bearer <female_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 13.0827,
    "longitude": 80.2707
  }'
```

#### Test 7: Male User Updates Location
1. **Objective**: Verify male user can update location after profile completion
2. **Setup**: Male user JWT token ready
3. **Steps**:
   - Send PATCH request to `/api/male-user/location`
   - Include new latitude and longitude
4. **Expected Result**: Location updated successfully
5. **Sample Request**:
```bash
curl -X PATCH "http://localhost:3000/api/male-user/location" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 13.0827,
    "longitude": 80.2707
  }'
```

### Phase 4: Dashboard Sections Testing

#### Test 8: Male User Gets "All" Section
1. **Objective**: Verify male user can see all online females
2. **Setup**: Male user JWT token ready, female users exist and online
3. **Steps**:
   - Send GET request to `/api/male-user/dashboard?section=all&page=1&limit=10`
4. **Expected Result**: List of all online females
5. **Sample Request**:
```bash
curl -X GET "http://localhost:3000/api/male-user/dashboard?section=all&page=1&limit=10" \
  -H "Authorization: Bearer <male_token>"
```

#### Test 9: Male User Gets "Nearby" Section
1. **Objective**: Verify male user can see females within admin distance
2. **Setup**: 
   - Admin distance configured (e.g., 5km)
   - Male user has location set
   - Female users exist with locations within distance
3. **Steps**:
   - Send GET request to `/api/male-user/dashboard?section=nearby&page=1&limit=10`
4. **Expected Result**: List of females within admin distance, sorted by proximity
5. **Sample Request**:
```bash
curl -X GET "http://localhost:3000/api/male-user/dashboard?section=nearby&page=1&limit=10" \
  -H "Authorization: Bearer <male_token>"
```
6. **Expected Response**:
```json
{
  "success": true,
  "data": {
    "section": "nearby",
    "total": 3,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "id": "female_user_id_1",
        "name": "Jane Doe",
        "age": 25,
        "hideAge": false,
        "profileImage": "image_url",
        "languages": ["English", "Hindi"],
        "coinsPerMin": 10,
        "distance": "2.5 km",
        "isFollowed": false
      }
    ]
  }
}
```

#### Test 10: Male User Gets "Followed" Section
1. **Objective**: Verify male user can see females they follow
2. **Setup**: Male user follows some female users
3. **Steps**:
   - Send GET request to `/api/male-user/dashboard?section=followed&page=1&limit=10`
4. **Expected Result**: List of followed females who are online
5. **Sample Request**:
```bash
curl -X GET "http://localhost:3000/api/male-user/dashboard?section=followed&page=1&limit=10" \
  -H "Authorization: Bearer <male_token>"
```

#### Test 11: Male User Gets "New" Section
1. **Objective**: Verify male user can see recently registered females
2. **Setup**: Female users registered in last 7 days exist
3. **Steps**:
   - Send GET request to `/api/male-user/dashboard?section=new&page=1&limit=10`
4. **Expected Result**: List of females registered in last 7 days
5. **Sample Request**:
```bash
curl -X GET "http://localhost:3000/api/male-user/dashboard?section=new&page=1&limit=10" \
  -H "Authorization: Bearer <male_token>"
```

### Phase 5: Edge Case Testing

#### Test 12: Invalid Coordinates Validation
1. **Objective**: Verify proper validation of coordinate ranges
2. **Setup**: User JWT token ready
3. **Steps**:
   - Send location update with invalid latitude (> 90)
   - Send location update with invalid longitude (> 180)
4. **Expected Result**: Error responses for invalid coordinates
5. **Sample Request**:
```bash
curl -X PATCH "http://localhost:3000/api/male-user/location" \
  -H "Authorization: Bearer <male_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 100,
    "longitude": 77.5946
  }'
```
6. **Expected Response**:
```json
{
  "success": false,
  "message": "Latitude must be a number between -90 and 90"
}
```

#### Test 13: Nearby Section with No Nearby Females
1. **Objective**: Verify nearby section returns empty when no females within distance
2. **Setup**: 
   - Admin distance configured (e.g., 1km)
   - Male user has location set
   - No female users within the specified distance
3. **Steps**:
   - Send GET request to `/api/male-user/dashboard?section=nearby&page=1&limit=10`
4. **Expected Result**: Empty items array with success response
5. **Sample Response**:
```json
{
  "success": true,
  "data": {
    "section": "nearby",
    "total": 0,
    "page": 1,
    "limit": 10,
    "items": []
  }
}
```

#### Test 14: Privacy Controls Verification
1. **Objective**: Verify offline females are not shown in any section
2. **Setup**: 
   - Female user exists with onlineStatus = false
   - Male user has valid token
3. **Steps**:
   - Send GET request to any dashboard section
4. **Expected Result**: Offline females are not included in results

## Error Handling Tests

### Authentication Errors
- **Unauthorized Access**: All endpoints require valid JWT tokens
- **Invalid Token**: Should return 401 Unauthorized
- **Expired Token**: Should return 401 Unauthorized

### Validation Errors
- **Missing Fields**: Required fields validation
- **Invalid Data Types**: Proper type checking
- **Range Validation**: Coordinate range validation
- **Business Logic**: Profile completion requirements

## Performance Testing Considerations

### 1. Database Query Optimization
- Indexes on location fields for efficient distance calculations
- Proper pagination to handle large result sets
- Aggregation pipeline optimization for dashboard sections

### 2. Distance Calculation Efficiency
- Haversine formula implementation for accurate distance calculation
- Caching of admin distance settings
- Efficient filtering of results

## Postman Collection Structure

```
Location & Nearby Feature API Testing
├── Admin Configuration
│   ├── Update Nearby Distance
│   └── Get Nearby Distance
├── Female User
│   ├── Complete Profile with Location
│   ├── Complete Profile without Location (Error)
│   ├── Update Location
│   └── Update Profile (Online Status)
├── Male User
│   ├── Complete Profile with Location
│   ├── Update Location
│   └── Update Profile (Online Status)
└── Male Dashboard
    ├── Get All Section
    ├── Get Nearby Section
    ├── Get Followed Section
    ├── Get New Section
    └── Error Cases
```

## Test Execution Order

1. **Setup Phase**: Admin configuration tests
2. **User Registration Phase**: Profile completion with location
3. **Location Management Phase**: Location updates
4. **Dashboard Phase**: All dashboard sections
5. **Edge Cases**: Error handling and validation
6. **Integration Phase**: Complete workflow testing

## Success Criteria

- All API endpoints return expected responses
- Location validation works correctly
- Distance calculations are accurate
- Dashboard sections filter correctly
- Privacy controls are enforced
- Error handling works as expected
- Profile completion requires location