# Female User Online Status and Location Refresh System

## Overview
This document outlines the female user online status and location refresh system that implements a clean, privacy-friendly approach without heartbeat tracking. The system uses three key components to maintain accurate online presence and location data.

## Key Components

### 1. Toggle Online Status with Location
- Updates online status and location when user goes online/offline
- **MANDATORY**: When going online, GPS coordinates must be provided
- Enforces that online users have current location data

### 2. Location Refresh
- Updates location when app opens/resumes
- **RESTRICTED**: Only updates location if user is currently online
- Automatic refresh without user interaction

### 3. Backend TTL Protection
- Filters out stale locations in nearby searches (max 15 minutes old)
- Ensures location accuracy for male users
- Uses efficient MongoDB queries with TTL checks

### 4. Schema Enhancement
- Added `locationUpdatedAt` field to FemaleUser schema
- Tracks when location was last updated for TTL enforcement

## API Endpoints

### 1. Toggle Online Status
```
POST /female-user/toggle-online-status
```

#### Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "onlineStatus": true,
  "latitude": 17.3850,
  "longitude": 78.4867
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| onlineStatus | Boolean | Yes | true to go online, false to go offline |
| latitude | Number | **Yes when onlineStatus=true** | Latitude when going online |
| longitude | Number | **Yes when onlineStatus=true** | Longitude when going online |

#### Success Response
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "onlineStatus": true,
    "totalOnlineMinutes": 120
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "onlineStatus (boolean) is required in request body"
}
```

### 2. Location Refresh
```
POST /female-user/location/refresh
```

#### Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| latitude | Number | Yes | Current latitude |
| longitude | Number | Yes | Current longitude |

#### Success Response (Online User)
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

#### Success Response (Offline User)
```json
{
  "success": true,
  "message": "User is offline, location update ignored",
  "data": {
    "onlineStatus": false
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "latitude and longitude are required in request body"
}
```

## Frontend Implementation

### 1. When User Toggles Online Status
```javascript
// When user clicks "Go Online"
const goOnline = async () => {
  const location = await getCurrentLocation(); // Get live GPS
  
  await fetch('/female-user/toggle-online-status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      onlineStatus: true,
      latitude: location.latitude,
      longitude: location.longitude
    })
  });
};

// When user clicks "Go Offline"
const goOffline = async () => {
  await fetch('/female-user/toggle-online-status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      onlineStatus: false
    })
  });
};
```

### 2. When App Opens/Resumes
```javascript
// When app starts or comes to foreground
const onAppResume = async () => {
  try {
    const user = await getCurrentUser(); // Get current user status
    
    if (user.onlineStatus === true) {
      const location = await getCurrentLocation(); // Get live GPS
      
      await fetch('/female-user/location/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude
        })
      });
    }
  } catch (error) {
    console.log('Location refresh not needed or failed:', error);
  }
};

// Register event listeners
document.addEventListener('resume', onAppResume); // Cordova/PhoneGap
window.addEventListener('focus', onAppResume); // Web browsers
```

## Backend TTL Protection

### MongoDB-Based TTL Filtering
When male users search for nearby females, the backend applies an efficient TTL check directly in the MongoDB query:

```javascript
// In male user dashboard nearby section
const MAX_LOCATION_AGE_MINUTES = 15;

const nearbyFemales = allEligibleFemales.filter(female => {
  // Skip females without location
  if (!female.latitude || !female.longitude) {
    return false;
  }
  
  // Check if location is too old (stale location protection)
  if (female.locationUpdatedAt) {
    const locationAgeMinutes = (new Date() - new Date(female.locationUpdatedAt)) / (1000 * 60);
    if (locationAgeMinutes > MAX_LOCATION_AGE_MINUTES) {
      return false; // Skip females with stale location
    }
  }
  
  // Calculate distance and apply other filters...
  return distance <= adminDistanceInKm;
});
```

## Privacy and Battery Considerations

### No Background Tracking
- No continuous GPS tracking
- No heartbeat calls
- No battery-draining background processes

### User Control
- Location only sent when user interacts with app
- Location refresh only when app is active
- No automatic location sharing without consent

## Error Handling

### Location Validation
- Latitude must be between -90 and 90
- Longitude must be between -180 and 180
- Proper error messages for invalid coordinates

### User Status
- Online status can only be boolean
- Proper authentication required
- User existence validation

## Security Measures

### Authentication
- JWT token required for all endpoints
- User permission validation
- Session management

### Data Validation
- Coordinate bounds validation
- Type checking for all inputs
- Sanitized input processing

## Benefits

### For Female Users
- ✅ No battery drain from background location tracking
- ✅ No annoying permission popups
- ✅ Location updated automatically when using app
- ✅ Privacy-friendly approach

### For Male Users
- ✅ Accurate nearby results
- ✅ No stale location data shown
- ✅ Fresh location information
- ✅ Reliable nearby searches

### For System
- ✅ Reduced server load (no heartbeat)
- ✅ Efficient location updates
- ✅ Scalable architecture
- ✅ Minimal API overhead
- ✅ Backend TTL protection prevents stale location display
- ✅ Schema enhanced with locationUpdatedAt for tracking

## Complete Flow Example

### Scenario: Female User Traveling
1. **Step 1**: Rani goes online in Hyderabad
   - Calls `POST /female-user/toggle-online-status`
   - Sends location: latitude: 17.3850, longitude: 78.4867

2. **Step 2**: Rani travels to Bangalore (without app usage)
   - Location becomes stale in database
   - But still shows as online

3. **Step 3**: Rani opens app again in Bangalore
   - App detects user is online
   - Calls `POST /female-user/location/refresh`
   - Updates location: latitude: 12.9716, longitude: 77.5946

4. **Step 4**: Male searches for nearby users
   - Backend checks location freshness
   - Shows Rani with current Bangalore location
   - Filters out users with stale (>15 min) locations

This system provides accurate location data while respecting user privacy and battery life!