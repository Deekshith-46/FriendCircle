# Location Update API Documentation

## Endpoint
```
PATCH /male-user/location
```

## Description
Allows authenticated male users to update their location coordinates (latitude and longitude).

## Authentication
JWT Bearer token required in Authorization header.

## Request Body
```json
{
  "latitude": -34.0522,
  "longitude": -118.2437
}
```

## Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| latitude | Number | Yes | Latitude coordinate (-90 to 90) |
| longitude | Number | Yes | Longitude coordinate (-180 to 180) |

## Validation Rules
- Both latitude and longitude must be provided
- Latitude must be between -90 and 90 degrees
- Longitude must be between -180 and 180 degrees
- Values must be valid numbers

## Success Response
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "latitude": -34.0522,
    "longitude": -118.2437
  }
}
```

## Error Responses

### Missing Parameters
```json
{
  "success": false,
  "message": "latitude and longitude are required"
}
```

### Invalid Latitude
```json
{
  "success": false,
  "message": "latitude must be a number between -90 and 90"
}
```

### Invalid Longitude
```json
{
  "success": false,
  "message": "longitude must be a number between -180 and 180"
}
```

### User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### Unauthorized Access
```
HTTP 401 - Unauthorized
```

## Usage Example
```javascript
fetch('/male-user/location', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Notes
- The location coordinates are stored in the MaleUser model
- These coordinates are used for nearby user searches and distance calculations
- Coordinates are validated for proper geographic ranges
- The API returns the updated coordinates in the response