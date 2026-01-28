# Preferences Update API

## Overview
This document describes the new API endpoints for updating user preferences including hobbies, sports, film, music, and travel interests. These endpoints allow both male and female users to manually enter their preferences as text strings rather than selecting from predefined options.

## Female User Endpoints

### Update Hobbies
```
PUT /api/female-user/hobbies
```
**Request Body:**
```json
{
  "hobbies": ["Singing", "Chilling", "Reading"]
}
```

### Update Sports
```
PUT /api/female-user/sports
```
**Request Body:**
```json
{
  "sports": ["Badminton", "Swimming"]
}
```

### Update Film Preferences
```
PUT /api/female-user/film
```
**Request Body:**
```json
{
  "film": ["Horror movies", "Romantic comedies"]
}
```

### Update Music Preferences
```
PUT /api/female-user/music
```
**Request Body:**
```json
{
  "music": ["Classical", "Pop", "Jazz"]
}
```

### Update Travel Preferences
```
PUT /api/female-user/travel
```
**Request Body:**
```json
{
  "travel": ["Beaches", "Mountains", "Historical sites"]
}
```

## Male User Endpoints

### Update Hobbies
```
PUT /api/male-user/hobbies
```
**Request Body:**
```json
{
  "hobbies": ["Gaming", "Cooking", "Photography"]
}
```

### Update Sports
```
PUT /api/male-user/sports
```
**Request Body:**
```json
{
  "sports": ["Football", "Basketball"]
}
```

### Update Film Preferences
```
PUT /api/male-user/film
```
**Request Body:**
```json
{
  "film": ["Action movies", "Documentaries"]
}
```

### Update Music Preferences
```
PUT /api/male-user/music
```
**Request Body:**
```json
{
  "music": ["Rock", "Hip Hop", "Electronic"]
}
```

### Update Travel Preferences
```
PUT /api/male-user/travel
```
**Request Body:**
```json
{
  "travel": ["Cities", "Countryside", "Adventure tours"]
}
```

## Data Model

Both MaleUser and FemaleUser schemas now include the following new fields:

```javascript
{
  hobbies: [{ type: String }],
  sports: [{ type: String }],
  film: [{ type: String }],
  music: [{ type: String }],
  travel: [{ type: String }]
}
```

## Response Format

All endpoints return a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Hobbies updated successfully",
  "data": {
    "hobbies": ["Singing", "Chilling", "Reading"]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Hobbies array is required"
}
```

## Usage Notes

1. All endpoints require authentication via JWT token
2. Each endpoint accepts an array of strings
3. Existing values are completely replaced (not appended)
4. Empty arrays are accepted to clear preferences
5. Fields are returned in user profile responses automatically