# Pending Registrations Image URL Enhancement

## Problem
In the pending registrations API endpoint, female users were returning image IDs instead of direct image URLs, while agency users were returning direct image URLs. This inconsistency made it difficult for the frontend to display images uniformly.

## Solution
Modified the `listPendingRegistrations` function in the admin controller to populate female user images and transform the response to return image URLs directly, matching the agency user format.

## Changes Made

### File: `src/controllers/adminControllers/userManagementController.js`

**Function:** `listPendingRegistrations` (lines 749-765)

**Before:**
```javascript
if (!userType || userType === 'female') {
    data.females = await FemaleUser.find({ reviewStatus: 'pending' }).select('_id name email mobileNumber images videoUrl bio age gender createdAt updatedAt reviewStatus kycStatus rejectionReason');
}
```

**After:**
```javascript
if (!userType || userType === 'female') {
    const females = await FemaleUser.find({ reviewStatus: 'pending' })
        .select('_id name email mobileNumber images videoUrl bio age gender createdAt updatedAt reviewStatus kycStatus rejectionReason')
        .populate({ path: 'images', select: 'imageUrl' });
    
    // Transform to include only the first image URL directly (not as array)
    data.females = females.map(female => {
        const femaleObj = female.toObject();
        // Extract only the first image URL
        if (femaleObj.images && femaleObj.images.length > 0) {
            femaleObj.image = femaleObj.images[0].imageUrl; // Single image URL
        } else {
            femaleObj.image = null; // No image available
        }
        // Remove the images array since we're returning single image
        delete femaleObj.images;
        return femaleObj;
    });
}
```

## Expected Response Format

### Before (Female Users):
```json
{
  "success": true,
  "data": {
    "females": [
      {
        "_id": "6981d53e030941462d4ea339",
        "email": "777@gmail.com",
        "mobileNumber": "7777777777",
        "images": [
          "698713fd7e71806c4f28b1f3"  // Image ID (not URL)
        ],
        "name": "Female E",
        "reviewStatus": "pending"
      }
    ]
  }
}
```

### After (Female Users):
```json
{
  "success": true,
  "data": {
    "females": [
      {
        "_id": "6981d53e030941462d4ea339",
        "email": "777@gmail.com",
        "mobileNumber": "7777777777",
        "image": "https://res.cloudinary.com/dqtasamcu/image/upload/v1770460125/female_images/example1.jpg",
        "name": "Female E",
        "reviewStatus": "pending"
      }
    ]
  }
}
```

### Agency Users (Unchanged - Already correct):
```json
{
  "success": true,
  "data": {
    "agencies": [
      {
        "_id": "696e0b0735287e64ecb95bbe",
        "email": "agencyD@gmail.com",
        "mobileNumber": "9966338868",
        "image": "https://res.cloudinary.com/dqtasamcu/image/upload/v1768819719/agency_images/hd4plhxias1wf7zdkyqj.jpg",
        "firstName": "Agency C",
        "lastName": "Earn",
        "reviewStatus": "pending"
      }
    ]
  }
}
```

## Benefits

1. **Consistency**: Both female and agency users now return a single image URL in the same format (`image` field)
2. **Frontend Simplicity**: Frontend can access the image the same way for both user types: `user.image`
3. **Performance**: Reduces data transfer by only sending the first image
4. **User Experience**: Simplified image handling for admin review interface

## Testing

A test script (`test-pending-registrations.js`) has been created to verify the functionality:
- Creates test female and agency users with images
- Tests the transformation logic
- Verifies that female users return a single image URL (not array)
- Confirms consistency with agency user format (`image` field)

## Implementation Notes

- The change only affects the pending registrations endpoint
- Existing functionality for other endpoints remains unchanged
- The transformation preserves all other user data
- No images scenario is handled gracefully (returns `null`)
- The `images` array is removed from the response since we only return the first image
- No database schema changes were required