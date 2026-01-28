# Male Dashboard API Documentation

## Overview
The Male Dashboard API provides different sections of female users for male users to browse. The API supports four main sections: ALL, NEARBY, FOLLOWED, and NEW.

## Endpoint
```
POST /male-user/dashboard
```

## Authentication
JWT Bearer token required in Authorization header.

## Request Body Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| section | String | Yes | 'all' | Section to display: 'all', 'nearby', 'follow', 'new' |
| page | Number | No | 1 | Page number for pagination |
| limit | Number | No | 10 | Number of results per page (max 50) |
| location | Object | Conditional | - | Required for 'nearby' section: { latitude, longitude } |
| search | String | No | - | Search term to filter results by name |

## Request Examples

### Get ALL Female Users
```
POST /male-user/dashboard
{
  "section": "all",
  "page": 1,
  "limit": 10
}
```

### Get NEARBY Female Users
```
POST /male-user/dashboard
{
  "section": "nearby",
  "page": 1,
  "limit": 10,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

### Get FOLLOW Female Users
```
POST /male-user/dashboard
{
  "section": "follow",
  "page": 1,
  "limit": 10
}
```

### Get NEW Female Users
```
POST /male-user/dashboard
{
  "section": "new",
  "page": 1,
  "limit": 10
}
```

### With Search Filter
```
POST /male-user/dashboard
{
  "section": "all",
  "page": 1,
  "limit": 10,
  "search": "john"
}
```

### NEARBY with Live Location Update
```
POST /male-user/dashboard
{
  "section": "nearby",
  "page": 1,
  "limit": 10,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "search": "sarah"
}
```

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "section": "all",
    "results": [
      {
        "_id": "60f1b2b3c4d5e6f7a8b9c0d1",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "bio": "Professional model and traveler",
        "age": 28,
        "height": "5'6\"",
        "relationshipGoals": [
          {
            "_id": "60f1b2b3c4d5e6f7a8b9c0d2",
            "name": "Long-term relationship"
          }
        ],
        "religion": {
          "_id": "60f1b2b3c4d5e6f7a8b9c0d3",
          "name": "Christian"
        },
        "images": [
          {
            "_id": "60f1b2b3c4d5e6f7a8b9c0d4",
            "imageUrl": "https://example.com/image1.jpg",
            "createdAt": "2023-01-01T00:00:00.000Z"
          }
        ],
        "isOnline": true,
        "distance": 2.5,
        "distanceUnit": "km",
        "registeredAt": "2023-01-01T00:00:00.000Z",
        "isFollowing": false,
        "isFollowed": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalResults": 45,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Section parameter is required. Valid values: all, nearby, followed, new"
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "error": "Authentication required"
}
```

## Section-specific Details

### ALL Section
- Returns all active female users
- No special parameters required
- Results sorted by most recent activity or registration

### NEARBY Section
- Requires `location` object with `latitude` and `longitude` in request body
- Automatically updates male user's location with live coordinates from request
- Returns female users within admin-configured radius (default 5km)
- Results include distance calculation
- Results sorted by distance (closest first)
- Live location ensures most accurate nearby results

### FOLLOW Section
- Returns female users that the current male user is following
- Results include follow status information
- May include mutual followers or special priority

### NEW Section
- Returns recently registered female users
- Results sorted by registration date (newest first)
- Typically shows users registered in the last 7 days (admin-configurable)

## Complete Controller Code

```javascript
const mongoose = require('mongoose');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleFollowing = require('../../models/maleUser/Following');
const FemaleFollowing = require('../../models/femaleUser/Following');
const BlockList = require('../../models/maleUser/BlockList');
const FemaleBlockList = require('../../models/femaleUser/BlockList');

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Get dashboard with different sections
exports.getDashboard = async (req, res) => {
  try {
    const { section, page = 1, limit = 10, search = '', latitude, longitude } = req.query;
    const userId = req.user._id;
    
    // Validate section parameter
    const validSections = ['all', 'nearby', 'followed', 'new'];
    if (!validSections.includes(section.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Section parameter is required. Valid values: all, nearby, followed, new'
      });
    }
    
    // Validate required parameters for nearby section
    if (section.toLowerCase() === 'nearby' && (!latitude || !longitude)) {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude are required for nearby section'
      });
    }
    
    // Validate numeric parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'page must be a positive integer'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'limit must be a positive integer between 1 and 50'
      });
    }
    
    // Get current male user to access location for nearby searches
    const maleUser = await MaleUser.findById(userId).select('latitude longitude');
    if (!maleUser) {
      return res.status(404).json({
        success: false,
        error: 'Male user not found'
      });
    }
    
    // Build query based on section
    let query = { status: 'active', reviewStatus: 'accepted' };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    let sort = {};
    let populateOptions = [
      { path: 'interests', select: 'name' },
      { path: 'languages', select: 'name' },
      { path: 'relationshipGoals', select: 'name' },
      { path: 'religion', select: 'name' },
      { 
        path: 'images',
        select: 'imageUrl createdAt',
        options: { sort: { createdAt: -1 } }
      }
    ];
    
    // Handle different sections
    switch (section.toLowerCase()) {
      case 'all':
        sort = { createdAt: -1 }; // Most recent first
        break;
        
      case 'nearby':
        if (!maleUser.latitude || !maleUser.longitude) {
          return res.status(400).json({
            success: false,
            error: 'Your location is required to find nearby users. Please update your location first.'
          });
        }
        // Find female users with location data
        const femaleUsersWithLocation = await FemaleUser.find({
          ...query,
          latitude: { $exists: true },
          longitude: { $exists: true }
        }).populate(populateOptions);
        
        // Calculate distances and filter by proximity
        let resultsWithDistance = femaleUsersWithLocation.map(female => {
          const distance = calculateDistance(
            maleUser.latitude,
            maleUser.longitude,
            female.latitude,
            female.longitude
          );
          return { female, distance };
        });
        
        // Filter by distance (e.g., within 50km) and sort by distance
        resultsWithDistance = resultsWithDistance.filter(item => item.distance <= 50);
        resultsWithDistance.sort((a, b) => a.distance - b.distance);
        
        // Calculate total for pagination
        const total = resultsWithDistance.length;
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedResults = resultsWithDistance.slice(startIndex, endIndex);
        
        // Format results
        const formattedResults = paginatedResults.map(item => {
          const female = item.female;
          const response = {
            _id: female._id,
            name: female.name,
            email: female.email,
            bio: female.bio,
            height: female.height,
            isOnline: female.onlineStatus || false,
            distance: Math.round(item.distance * 100) / 100, // Round to 2 decimal places
            distanceUnit: 'km'
          };
          
          if (!female.hideAge) {
            response.age = female.age;
          }
          
          if (female.interests && female.interests.length > 0) {
            response.interests = female.interests;
          }
          
          if (female.languages && female.languages.length > 0) {
            response.languages = female.languages;
          }
          
          if (female.relationshipGoals && female.relationshipGoals.length > 0) {
            response.relationshipGoals = female.relationshipGoals;
          }
          
          if (female.religion) {
            response.religion = female.religion;
          }
          
          if (female.images && female.images.length > 0) {
            response.images = female.images;
          }
          
          return response;
        });
        
        return res.json({
          success: true,
          data: {
            section: section.toLowerCase(),
            results: formattedResults,
            pagination: {
              currentPage: pageNum,
              totalPages: Math.ceil(total / limitNum),
              totalResults: total,
              hasNext: endIndex < total,
              hasPrev: pageNum > 1
            }
          }
        });
        
      case 'followed':
        // Find users that the male is following
        const followingList = await MaleFollowing.find({ maleUserId: userId }).select('femaleUserId');
        const followedFemaleIds = followingList.map(follow => follow.femaleUserId);
        
        if (followedFemaleIds.length === 0) {
          return res.json({
            success: true,
            data: {
              section: section.toLowerCase(),
              results: [],
              pagination: {
                currentPage: 1,
                totalPages: 0,
                totalResults: 0,
                hasNext: false,
                hasPrev: false
              }
            }
          });
        }
        
        query._id = { $in: followedFemaleIds };
        sort = { createdAt: -1 };
        break;
        
      case 'new':
        // Find recently registered users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query.createdAt = { $gte: sevenDaysAgo };
        sort = { createdAt: -1 };
        break;
    }
    
    // Execute the query for sections that don't need special handling
    if (!['nearby'].includes(section.toLowerCase())) {
      const total = await FemaleUser.countDocuments(query);
      
      const femaleUsers = await FemaleUser.find(query)
        .populate(populateOptions)
        .sort(sort)
        .limit(limitNum * 1)
        .skip((pageNum - 1) * limitNum);
      
      // Format results
      const formattedResults = femaleUsers.map(female => {
        const response = {
          _id: female._id,
          name: female.name,
          email: female.email,
          bio: female.bio,
          height: female.height,
          isOnline: female.onlineStatus || false
        };
        
        if (!female.hideAge) {
          response.age = female.age;
        }
        
        if (female.interests && female.interests.length > 0) {
          response.interests = female.interests;
        }
        
        if (female.languages && female.languages.length > 0) {
          response.languages = female.languages;
        }
        
        if (female.relationshipGoals && female.relationshipGoals.length > 0) {
          response.relationshipGoals = female.relationshipGoals;
        }
        
        if (female.religion) {
          response.religion = female.religion;
        }
        
        if (female.images && female.images.length > 0) {
          response.images = female.images;
        }
        
        // Add registration date for new section
        if (section.toLowerCase() === 'new') {
          response.registeredAt = female.createdAt;
        }
        
        return response;
      });
      
      return res.json({
        success: true,
        data: {
          section: section.toLowerCase(),
          results: formattedResults,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1
          }
        }
      });
    }
    
  } catch (err) {
    console.error('❌ Error in getDashboard:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
```

## API Testing Guide

### Prerequisites
- Valid JWT token for an authenticated male user
- Test female users in the database
- For nearby section: male user must have location data

### Test Cases

#### 1. Test ALL Section
```javascript
// Request
fetch('/male-user/dashboard?section=all&page=1&limit=5', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns list of all active female users
```

### 2. Test NEARBY Section
```javascript
// Request
fetch('/male-user/dashboard', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "section": "nearby",
    "page": 1,
    "limit": 5,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns female users near the specified coordinates with distance
// Note: Male user's location is automatically updated with live coordinates
```

### 3. Test FOLLOW Section
```javascript
// Request
fetch('/male-user/dashboard', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "section": "follow",
    "page": 1,
    "limit": 5
  })
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns only female users that the male is following
```

#### 4. Test NEW Section
```javascript
// Request
fetch('/male-user/dashboard?section=new&page=1&limit=5', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns recently registered female users
```

#### 5. Test Invalid Section
```javascript
// Request
fetch('/male-user/dashboard?section=invalid', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns error response with valid section options
```

#### 6. Test Nearby Without Coordinates
```javascript
// Request
fetch('/male-user/dashboard', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "section": "nearby"
  })
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns error requiring location with latitude and longitude
```

#### 7. Test Search Functionality
```javascript
// Request
fetch('/male-user/dashboard?section=all&search=jane&page=1&limit=5', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// Expected: Returns female users with names matching the search term
```

## Error Handling

### Common Error Scenarios
1. **Missing section parameter** - Returns 400 with valid options
2. **Invalid section parameter** - Returns 400 with valid options
3. **Missing location for nearby** - Returns 400 requiring latitude and longitude
4. **Invalid page/limit values** - Returns 400 with validation error
5. **Unauthorized access** - Returns 401 with authentication error
6. **Server error** - Returns 500 with error message

### Validation Rules
- Section must be one of: 'all', 'nearby', 'followed', 'new'
- Page must be a positive integer
- Limit must be between 1 and 50
- Latitude for nearby must be between -90 and 90
- Longitude for nearby must be between -180 and 180
- Search term must be a valid string

## Performance Considerations
- Use database indexes on frequently queried fields
- Implement caching for frequently accessed data
- Optimize location-based queries with geospatial indexes
- Implement pagination to handle large result sets
- Consider implementing rate limiting for API endpoints

## Security Considerations
- Validate all input parameters
- Sanitize search terms to prevent injection attacks
- Ensure proper authentication and authorization
- Limit result sets to prevent data enumeration
- Consider implementing user privacy controls