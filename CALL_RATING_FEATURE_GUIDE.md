# Call Rating Feature Implementation Guide

This guide provides a comprehensive, step-by-step explanation of how the call rating feature works in the Friend Circle app. It covers the backend implementation, API flows, and frontend integration.

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [API Endpoints](#api-endpoints)
4. [Call Flow Integration](#call-flow-integration)
5. [Security Constraints](#security-constraints)
6. [Frontend Implementation](#frontend-implementation)
7. [Testing Guide](#testing-guide)

## Feature Overview

The call rating feature allows female users to rate calls after they end. The system follows this flow:
- Call ends (either male or female ends it)
- Female user receives a `ratingRequired: true` flag in the response
- Female sees a rating popup to select 1-5 stars
- Backend saves the rating and maps stars to predefined messages
- Both male and female users see the rating in call history

### Star-to-Message Mapping
| Stars | Message   |
|-------|-----------|
| 1 ⭐  | Very Bad  |
| 2 ⭐  | Bad       |
| 3 ⭐  | Average   |
| 4 ⭐  | Good      |
| 5 ⭐  | Very Good |

## Database Schema Changes

### CallHistory Model Update
The `CallHistory` schema has been updated with new rating fields:

```javascript
rating: {
  stars: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  message: {
    type: String,
    default: null
  },
  ratedBy: {
    type: String,
    enum: ['female'],
    default: null
  },
  ratedAt: {
    type: Date,
    default: null
  }
}
```

These fields are stored as part of each call record and are accessible to both users through the call history APIs.

## API Endpoints

### 1. Call End Response Enhancement
**Endpoint**: `POST /api/male-user/calls/end` and `POST /api/female-user/calls/end`

**Response Change**:
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "callId": "call_record_id",
    "duration": 120,
    "totalCoins": 100,
    "ratingRequired": true  // NEW FIELD
  }
}
```

The `ratingRequired: true` flag signals that the female user should be prompted to rate the call.

### 2. Submit Call Rating API
**Endpoint**: `POST /api/female-user/calls/rate`

**Headers**:
```
Authorization: Bearer <FEMALE_JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "callId": "call_record_id",
  "stars": 3
}
```

**Request Validation**:
- `callId` is required
- `stars` must be a number between 1 and 5
- Only the call receiver (female) can rate the call
- Cannot rate if call is already rated

**Success Response**:
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "stars": 3,
    "message": "Average"
  }
}
```

**Error Responses**:
- 400: Invalid input, call not found, already rated
- 404: Call not found or unauthorized
- 500: Server error

## Call Flow Integration

### 1. Call Ending Process
1. Male or female user ends the call
2. Backend processes billing and earnings
3. Call history record is created/updated
4. Response includes `ratingRequired: true` flag for female user

### 2. Rating Prompt Process
1. Female user receives call end response with `ratingRequired: true`
2. Frontend detects this flag and shows rating popup
3. Female user selects star rating (1-5)
4. Frontend calls `POST /api/female-user/calls/rate` with rating

### 3. Rating Storage Process
1. Backend validates the rating request
2. Maps stars to corresponding message
3. Updates the call history record with rating data
4. Returns success response

## Security Constraints

### Who Can Rate
- ✅ Only female users (call receivers) can submit ratings
- ❌ Male users (call initiators) cannot rate calls
- ❌ Admin users cannot rate calls
- ❌ Agency users cannot rate calls

### Rating Validation
- ❌ Prevents duplicate ratings (checks if `rating.stars` already exists)
- ❌ Validates stars between 1-5 only
- ❌ Verifies the call belongs to the logged-in female user
- ❌ Blocks ratings for calls that don't exist

### Access Control
- All rating APIs require JWT authentication
- Female users can only rate calls they received
- Male users can only see ratings in call history (read-only)

## Frontend Implementation

### 1. Call End Handler
```javascript
// When call ends
async function handleCallEnd(callData) {
  // Backend returns response with ratingRequired flag
  const response = await fetch('/api/male-user/calls/end', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify(callData)
  });
  
  const result = await response.json();
  
  // Check if rating is required
  if (result.data?.ratingRequired) {
    showRatingPopup(result.data.callId);
  }
}
```

### 2. Rating Popup Implementation
```javascript
function showRatingPopup(callId) {
  // Create rating modal
  const ratingModal = document.createElement('div');
  ratingModal.innerHTML = `
    <div class="rating-popup">
      <h3>Please rate this call</h3>
      <div class="star-rating">
        <span class="star" data-rating="1">⭐</span>
        <span class="star" data-rating="2">⭐</span>
        <span class="star" data-rating="3">⭐</span>
        <span class="star" data-rating="4">⭐</span>
        <span class="star" data-rating="5">⭐</span>
      </div>
      <button id="submit-rating">Submit Rating</button>
    </div>
  `;
  
  // Add event listeners for star selection
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
      const rating = parseInt(this.getAttribute('data-rating'));
      highlightStars(rating);
      submitRating(callId, rating);
    });
  });
  
  document.body.appendChild(ratingModal);
}

function highlightStars(selectedRating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach((star, index) => {
    if (index < selectedRating) {
      star.style.color = '#FFD700'; // Gold color
    } else {
      star.style.color = '#CCCCCC'; // Gray color
    }
  });
}

async function submitRating(callId, stars) {
  try {
    const response = await fetch('/api/female-user/calls/rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        callId: callId,
        stars: stars
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Hide popup and show success message
      document.querySelector('.rating-popup').remove();
      showMessage('Rating submitted successfully!');
    } else {
      showMessage(result.message || 'Failed to submit rating');
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    showMessage('Failed to submit rating');
  }
}
```

### 3. Call History Display
```javascript
// When displaying call history, show rating if available
function displayCallHistory(calls) {
  calls.forEach(call => {
    const ratingInfo = call.rating;
    
    if (ratingInfo && ratingInfo.stars) {
      // Display rating (e.g., "Average" for 3 stars)
      const ratingElement = document.createElement('div');
      ratingElement.className = 'call-rating';
      ratingElement.textContent = ratingInfo.message || 'No Rating';
      
      // Display stars as well
      const starsElement = document.createElement('div');
      starsElement.className = 'star-display';
      starsElement.textContent = '⭐'.repeat(ratingInfo.stars);
    }
  });
}
```

### 4. Handle Unrated Calls
```javascript
// Check if there are any unrated calls when app opens
async function checkUnratedCalls() {
  const response = await fetch('/api/female-user/calls/history', {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  
  const result = await response.json();
  
  // Look for calls that are completed but not rated
  const unratedCalls = result.data.filter(call => 
    call.status === 'completed' && 
    (!call.rating || !call.rating.stars)
  );
  
  // Prompt user to rate any unrated calls
  if (unratedCalls.length > 0) {
    showRatingPromptForUnratedCalls(unratedCalls);
  }
}
```

## Testing Guide

### Test Case 1: Normal Rating Flow
1. Make a call between male and female user
2. End the call (either party)
3. Verify female user receives `ratingRequired: true` in response
4. Submit a 3-star rating
5. Verify success response with stars and "Average" message
6. Check call history shows the rating

### Test Case 2: Duplicate Rating Prevention
1. Submit a rating for a call
2. Try to submit another rating for the same call
3. Verify second request is rejected with "Call has already been rated" error

### Test Case 3: Invalid Rating Values
1. Try to submit a 0-star rating
2. Verify rejection with "Stars must be a number between 1 and 5"
3. Try to submit a 6-star rating
4. Verify rejection with same error

### Test Case 4: Unauthorized Rating Attempts
1. Try to submit rating as a male user
2. Verify rejection with "Call not found or you are not authorized" error
3. Try to rate a call that doesn't belong to the user
4. Verify rejection with same error

### Test Case 5: Call History Integration
1. Make multiple calls and rate some of them
2. Fetch call history for both male and female users
3. Verify ratings appear correctly in history for both users
4. Verify unrated calls show no rating information

### Test Case 6: Edge Cases
1. End call with 0 duration and try to rate
2. Close app before rating and reopen
3. Verify rating prompt appears for unrated calls
4. Test rating after call history has been loaded

## Troubleshooting

### Issue: Rating popup not showing
- Check that the `ratingRequired` flag is being received in the call end response
- Verify the female user role is correctly identified
- Ensure the rating popup logic is triggered

### Issue: Rating submission failing
- Check that JWT token is valid and belongs to a female user
- Verify the call ID exists and belongs to the logged-in user
- Ensure the call hasn't been rated already

### Issue: Ratings not appearing in history
- Check that the CallHistory model includes the rating fields
- Verify the call history APIs return the rating data
- Ensure frontend is displaying the rating information

## Maintenance Notes

### Database Indexes
Consider adding indexes to optimize rating queries:
```javascript
// In CallHistory model
callHistorySchema.index({ 'rating.stars': 1 });
callHistorySchema.index({ 'rating.ratedAt': -1 });
```

### Future Enhancements
- Add rating comments/text feedback
- Allow male users to rate calls (future feature)
- Implement rating analytics and statistics
- Add rating reminders for un-rated calls

This guide covers all aspects of the call rating feature implementation. Follow these steps to understand how the feature works and how to maintain it effectively.