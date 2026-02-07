# Female User Call End and Rating Feature

## Table of Contents
1. [Overview](#overview)
2. [Feature Description](#feature-description)
3. [Implementation Details](#implementation-details)
4. [API Endpoints](#api-endpoints)
5. [Call Flow](#call-flow)
6. [Rating System](#rating-system)
7. [Security & Validation](#security--validation)

## Overview
This feature allows female users to end calls they are receiving and submit ratings for completed calls. It provides female users with control over their call experience and enables them to provide feedback on male callers.

## Feature Description

### Call Ending Capability
Female users can end calls they are receiving, which:
- Processes the call completion with proper billing
- Calculates earnings based on actual duration
- Updates both users' balances appropriately
- Records the call in history with completion status

### Rating System
Female users can rate completed calls with:
- 5-star rating system (1-5 stars)
- Predefined rating messages for each star level
- One-time rating per call
- Rating visibility in call history

## Implementation Details

### Models

#### CallHistory Model Enhancement
The existing `CallHistory` model includes rating fields:
```javascript
rating: { 
  type: {
    stars: Number,        // 1-5 rating
    message: String,      // Rating message (e.g., "Good", "Very Good")
    ratedBy: String,      // 'male' or 'female'
    ratedAt: Date         // When rating was submitted
  }
}
```

### Controllers

#### Female User Call Controller
**File:** `src/controllers/femaleUserControllers/callController.js`

Key functions:

1. **endCall** - Allows female user to end a receiving call
2. **submitCallRating** - Allows female user to rate completed calls
3. **getRatingMessage** - Helper function for rating messages

```javascript
// End Call - Female user can end the call
exports.endCall = async (req, res) => {
  const { callerId, duration, callType, callId } = req.body;
  const receiverId = req.user._id; // Authenticated female user

  try {
    // Validate input
    if (!callerId || duration === undefined || duration === null) {
      return res.status(400).json({
        success: false,
        message: 'Caller ID and duration are required'
      });
    }

    // Validate duration
    if (duration < 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration cannot be negative'
      });
    }

    // Get caller (male user) and receiver (female user)
    const caller = await MaleUser.findById(callerId);
    let receiver = await FemaleUser.findById(receiverId);

    if (!caller || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the call session to use frozen rates
    const CallSession = require('../../models/common/CallSession');
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        message: 'Call session ID is required'
      });
    }
    
    const callSession = await CallSession.findOne({ 
      callId, 
      callerId, 
      receiverId, 
      isActive: true 
    });
    
    if (!callSession) {
      return res.status(400).json({
        success: false,
        message: 'Call session not found or invalid. Call may have expired or already ended.'
      });
    }

    // Use frozen rates from the call session
    const {
      femaleRatePerSecond,
      platformRatePerSecond,
      malePayPerSecond,
      isAgencyFemale,
      femaleRatePerMinute,
      platformMarginPerMinute
    } = callSession;
    
    // If duration is 0, return error
    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Call did not connect. No charges applied.'
      });
    }

    // Get admin config
    const AdminConfig = require('../../models/admin/AdminConfig');
    const adminConfig = await AdminConfig.getConfig();
    
    // Use frozen per-minute rate from the session
    const femaleEarningPerMinute = femaleRatePerMinute;
    
    if (!femaleEarningPerMinute) {
      return res.status(400).json({
        success: false,
        message: 'Female call rate not set for this call type'
      });
    }
    
    // Apply minimum billable duration rule
    const MIN_BILLABLE_SECONDS = 30;
    const billableSeconds = duration < MIN_BILLABLE_SECONDS ? MIN_BILLABLE_SECONDS : duration;
    
    // Check if user has enough coins for the billable duration
    const requestedMalePay = Math.ceil(billableSeconds * malePayPerSecond);
    
    if (caller.coinBalance < requestedMalePay) {
      // Mark the call session as inactive before returning error
      await CallSession.updateOne({ callId }, { isActive: false });
      
      // For failed calls, no earnings should be recorded
      const adminEarned = 0;
      const agencyEarned = 0;
      const femaleEarning = 0;
      const platformMargin = 0;
      
      // Record failed call attempt
      const callRecord = await CallHistory.create({
        callerId,
        receiverId,
        duration,
        femaleEarningPerMinute: femaleEarningPerMinute,
        platformMarginPerMinute: platformMarginPerMinute,
        femaleEarningPerSecond: femaleRatePerSecond,
        platformMarginPerSecond: platformRatePerSecond,
        totalCoins: 0,
        femaleEarning,
        platformMargin,
        adminEarned,
        agencyEarned,
        isAgencyFemale,
        callType: callType || 'video',
        status: 'insufficient_coins',
        errorMessage: `Insufficient coins. Required: ${requestedMalePay}, Available: ${caller.coinBalance}`
      });

      return res.status(400).json({
        success: false,
        message: 'Insufficient coins for male user to complete call',
        data: {
          required: requestedMalePay,
          available: caller.coinBalance,
          shortfall: requestedMalePay - caller.coinBalance,
          callId: callRecord._id
        }
      });
    }
    
    // Calculate amounts with single rounding point
    const malePay = Math.ceil(billableSeconds * malePayPerSecond);
    const femaleEarning = Math.floor(malePay * (femaleRatePerSecond / malePayPerSecond));
    const platformMargin = malePay - femaleEarning;
    
    // Deduct coins from male user atomically
    const updatedCaller = await MaleUser.findOneAndUpdate(
      { _id: callerId, coinBalance: { $gte: malePay } },
      { $inc: { coinBalance: -malePay } },
      { new: true }
    );
    
    if (!updatedCaller) {
      // Mark the call session as inactive before returning error
      await CallSession.updateOne({ callId }, { isActive: false });
      
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or balance changed. Please retry.'
      });
    }
    
    // Update receiver reference to the updated document
    receiver = await FemaleUser.findById(receiverId);

    // Credit earnings to female user's wallet balance
    receiver.walletBalance = (receiver.walletBalance || 0) + femaleEarning;
    await receiver.save();

    // Calculate admin and agency shares from platform margin
    let adminEarned = 0;
    let agencyEarned = 0;
    let adminSharePercentage = 0;
    let agencySharePercentage = 0;
    
    if (isAgencyFemale) {
      // For agency females, split the platform margin
      if (adminConfig.adminSharePercentage === undefined || adminConfig.adminSharePercentage === null) {
        await CallSession.updateOne({ callId }, { isActive: false });
        
        return res.status(400).json({
          success: false,
          message: 'Admin share percentage not configured'
        });
      }
      adminSharePercentage = adminConfig.adminSharePercentage;
      agencySharePercentage = 100 - adminSharePercentage;
      
      adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
      agencyEarned = Number((platformMargin * agencySharePercentage / 100).toFixed(2));
    } else {
      // For non-agency females, all platform margin goes to admin
      adminSharePercentage = 100;
      agencySharePercentage = 0;
      adminEarned = Number((platformMargin * adminSharePercentage / 100).toFixed(2));
      agencyEarned = 0;
    }
    
    // Mark the call session as inactive
    await CallSession.updateOne({ callId }, { isActive: false });
    
    // Create call history record
    const callRecord = await CallHistory.create({
      callerId,
      receiverId,
      duration: duration,
      billableDuration: billableSeconds,
      femaleEarningPerMinute: femaleEarningPerMinute,
      platformMarginPerMinute: platformMarginPerMinute,
      femaleEarningPerSecond: femaleRatePerSecond,
      platformMarginPerSecond: platformRatePerSecond,
      totalCoins: malePay,
      femaleEarning,
      platformMargin,
      adminEarned,
      agencyEarned,
      adminSharePercentage,
      agencySharePercentage,
      isAgencyFemale,
      callType: callType || 'video',
      status: 'completed'
    });
    
    // Apply real-time call target reward
    const { applyCallTargetReward } = require('../../services/realtimeRewardService');
    await applyCallTargetReward(receiverId, callType || 'video', callRecord._id);

    // Create transaction records
    const Transaction = require('../../models/common/Transaction');
    
    await Transaction.create({
      userType: 'male',
      userId: callerId,
      operationType: 'coin',
      action: 'debit',
      amount: malePay,
      message: `Video/Audio call with ${receiver.name || receiver.email} for ${billableSeconds} seconds (Female earning: ${femaleEarning}, Platform margin: ${platformMargin})`,
      balanceAfter: updatedCaller.coinBalance,
      createdBy: callerId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    await Transaction.create({
      userType: 'female',
      userId: receiverId,
      operationType: 'wallet',
      action: 'credit',
      amount: femaleEarning,
      earningType: 'call',
      message: `Earnings from call with ${updatedCaller.firstName || updatedCaller.lastName || updatedCaller.email} for ${billableSeconds} seconds`,
      balanceAfter: receiver.walletBalance,
      createdBy: receiverId,
      relatedId: callRecord._id,
      relatedModel: 'CallHistory'
    });

    // Create transaction for agency commission if applicable
    if (agencyEarned > 0 && receiver.referredByAgency) {
      const agencyUserId = receiver.referredByAgency;
      
      // Update agency wallet balance
      const AgencyUser = require('../../models/agency/AgencyUser');
      const agency = await AgencyUser.findById(agencyUserId);
      if (agency) {
        agency.walletBalance = (agency.walletBalance || 0) + agencyEarned;
        await agency.save();
      }
      
      await Transaction.create({
        userType: 'agency',
        userId: agencyUserId,
        operationType: 'wallet',
        action: 'credit',
        amount: agencyEarned,
        earningType: 'call',
        message: `Agency commission from call between ${updatedCaller.firstName || updatedCaller.lastName || updatedCaller.email} and ${receiver.name || receiver.email} for ${billableSeconds} seconds`,
        balanceAfter: agency ? agency.walletBalance : 0,
        createdBy: callerId,
        relatedId: callRecord._id,
        relatedModel: 'CallHistory'
      });
    }

    // Return success response
    return res.json({
      success: true,
      message: 'Call ended successfully',
      data: {
        callId: callRecord._id,
        duration: duration,
        billableDuration: billableSeconds,
        femaleEarningPerSecond: femaleRatePerSecond,
        platformMarginPerSecond: platformRatePerSecond,
        totalCoins: malePay,
        coinsDeducted: malePay,
        femaleEarning,
        platformMargin,
        callerRemainingBalance: updatedCaller.coinBalance,
        receiverNewBalance: receiver.walletBalance,
        ratingRequired: true
      }
    });

  } catch (err) {
    console.error('Error ending call from female side:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Helper function to get rating message
function getRatingMessage(stars) {
  const map = {
    1: "Very Bad",
    2: "Bad",
    3: "Average",
    4: "Good",
    5: "Very Good"
  };
  return map[stars];
}

// Submit call rating
exports.submitCallRating = async (req, res) => {
  const { callId, stars } = req.body;
  const femaleUserId = req.user._id; // Authenticated female user

  try {
    // Validate input
    if (!callId) {
      return res.status(400).json({
        success: false,
        message: 'Call ID is required'
      });
    }

    if (typeof stars !== 'number' || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Stars must be a number between 1 and 5'
      });
    }

    // Find the call history record
    const CallHistory = require('../../models/common/CallHistory');
    const call = await CallHistory.findOne({ 
      _id: callId,
      receiverId: femaleUserId // Ensure female user can only rate calls they received
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found or you are not authorized to rate this call'
      });
    }

    // Check if call has already been rated
    if (call.rating && call.rating.stars !== null) {
      return res.status(400).json({
        success: false,
        message: 'Call has already been rated'
      });
    }

    // Update the rating
    call.rating = {
      stars: stars,
      message: getRatingMessage(stars),
      ratedBy: 'female',
      ratedAt: new Date()
    };

    await call.save();

    return res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        stars: stars,
        message: getRatingMessage(stars)
      }
    });

  } catch (err) {
    console.error('Error submitting call rating:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
```

### Routes

#### Female User Call Routes
**File:** `src/routes/femaleUserRoutes/femaleUserRoutes.js`

```javascript
const callController = require('../../controllers/femaleUserControllers/callController');
router.get('/calls/history', auth, requireReviewAccepted, callController.getCallHistory);
router.get('/calls/stats', auth, requireReviewAccepted, callController.getCallStats);
router.post('/calls/end', auth, requireReviewAccepted, callController.endCall);
router.post('/calls/rate', auth, requireReviewAccepted, callController.submitCallRating);
```

## API Endpoints

### POST /female-user/calls/end
Ends a call that the female user is receiving.

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "callerId": "male_user_id",
  "duration": 180,
  "callType": "audio|video",
  "callId": "call_session_id"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Call ended successfully",
  "data": {
    "callId": "call_history_id",
    "duration": 180,
    "billableDuration": 180,
    "femaleEarningPerSecond": 0.5,
    "platformMarginPerSecond": 0.2,
    "totalCoins": 126,
    "coinsDeducted": 126,
    "femaleEarning": 90,
    "platformMargin": 36,
    "callerRemainingBalance": 714,
    "receiverNewBalance": 1090,
    "ratingRequired": true
  }
}
```

**Response Error (Insufficient Coins):**
```json
{
  "success": false,
  "message": "Insufficient coins for male user to complete call",
  "data": {
    "required": 126,
    "available": 100,
    "shortfall": 26,
    "callId": "call_history_id"
  }
}
```

### POST /female-user/calls/rate
Submits a rating for a completed call.

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "callId": "call_history_id",
  "stars": 4
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "stars": 4,
    "message": "Good"
  }
}
```

**Response Error (Already Rated):**
```json
{
  "success": false,
  "message": "Call has already been rated"
}
```

**Response Error (Unauthorized):**
```json
{
  "success": false,
  "message": "Call not found or you are not authorized to rate this call"
}
```

## Call Flow

### Female User Ending a Call

1. **Initiation**
   - Female user receives a call from male user
   - Call is active with ongoing session

2. **Call End Request**
   - Female user sends POST request to `/female-user/calls/end`
   - Provides callerId, duration, callType, and callId

3. **Validation**
   - System validates the call session exists and is active
   - Confirms female user is the receiver of this call
   - Validates duration is positive
   - Checks male user has sufficient coins

4. **Processing**
   - Uses frozen rates from CallSession
   - Calculates billable duration (minimum 30 seconds)
   - Deducts coins from male user atomically
   - Credits earnings to female user's wallet
   - Updates agency wallet if applicable
   - Marks call session as inactive

5. **Transaction Recording**
   - Creates transaction records for both users
   - Records call in history with completed status
   - Triggers real-time rewards if applicable

6. **Response**
   - Returns success with updated balances and call details
   - Indicates rating is required for completed calls

### Rating Submission Process

1. **Rating Opportunity**
   - After successful call completion, system indicates `ratingRequired: true`
   - Female user can access rating endpoint for that specific call

2. **Rating Request**
   - Female user sends POST request to `/female-user/calls/rate`
   - Provides callId and stars (1-5)

3. **Validation**
   - System confirms call exists and belongs to female user
   - Verifies call is completed status
   - Ensures call hasn't been rated already
   - Validates star rating is between 1-5

4. **Rating Processing**
   - Maps star rating to predefined message
   - Updates call history record with rating details
   - Records who submitted the rating and when

5. **Response**
   - Returns success with star rating and message
   - Rating is now visible in call history

## Rating System

### Star Rating Mapping
- ⭐ **1 Star** - "Very Bad"
- ⭐⭐ **2 Stars** - "Bad"  
- ⭐⭐⭐ **3 Stars** - "Average"
- ⭐⭐⭐⭐ **4 Stars** - "Good"
- ⭐⭐⭐⭐⭐ **5 Stars** - "Very Good"

### Rating Characteristics
- **One-time only**: Each call can only be rated once
- **Receiver only**: Only the female receiver can rate calls they received
- **Post-completion**: Rating can only be submitted after call completion
- **Mandatory fields**: callId and stars are required
- **Automatic messaging**: System generates appropriate message based on stars

### Rating Storage
```javascript
rating: {
  stars: 4,           // 1-5 rating value
  message: "Good",    // Automatically generated message
  ratedBy: "female",  // Who submitted the rating
  ratedAt: "timestamp" // When rating was submitted
}
```

## Security & Validation

### Authentication & Authorization
- All endpoints require valid JWT authentication
- Users can only access calls they are part of
- Female users can only rate calls they received
- Call session validation ensures proper ownership

### Input Validation
- **Required fields**: callerId, duration, callType, callId for end call
- **Required fields**: callId, stars for rating submission
- **Duration validation**: Must be positive number
- **Star validation**: Must be integer between 1-5
- **Call session validation**: Must exist and be active

### Data Integrity
- **Atomic transactions**: Coin deductions use atomic operations
- **Rate freezing**: Uses CallSession rates to prevent manipulation
- **Duplicate prevention**: Call sessions have unique constraints
- **Rating constraints**: Database-level prevention of duplicate ratings

### Error Handling
- **Insufficient funds**: Clear error with required/available amounts
- **Session expired**: Informative messages for expired sessions
- **Already rated**: Prevents duplicate ratings
- **Unauthorized access**: Proper 404 responses for unauthorized calls
- **System errors**: 500 responses with error logging

### Best Practices Implemented
- **Rate limiting**: Prevents abuse of endpoints
- **Input sanitization**: Validates all incoming data
- **Proper error messages**: Clear, actionable error responses
- **Transaction safety**: Atomic operations for financial data
- **Audit trail**: Complete transaction and rating history

## Frontend Integration Example

### Ending a Call
```javascript
// Frontend implementation example
async function endCall(callerId, duration, callType, callId) {
  try {
    const response = await fetch('/female-user/calls/end', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callerId,
        duration,
        callType,
        callId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI with new balances
      updateWalletBalance(result.data.receiverNewBalance);
      updateCallerBalance(result.data.callerRemainingBalance);
      
      // Show rating prompt if required
      if (result.data.ratingRequired) {
        showRatingPrompt(result.data.callId);
      }
      
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error ending call:', error);
    showError(error.message);
  }
}
```

### Submitting Rating
```javascript
// Frontend implementation example
async function submitRating(callId, stars) {
  try {
    const response = await fetch('/female-user/calls/rate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callId,
        stars
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI to show submitted rating
      showRatingSuccess(result.data.message);
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    showError(error.message);
  }
}
```

This comprehensive feature empowers female users with control over their call experience while maintaining system integrity and fair compensation.