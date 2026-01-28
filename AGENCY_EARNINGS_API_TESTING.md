# Agency Earnings API – Testing Guide

## Base URL
BASE_URL

---

## 1. EARNINGS ENDPOINT

### 1.1 Get Agency Earnings by Referred Females
```
POST /agency/earnings
```

**Request Body Parameters:**
- `filter`: "thisWeek" | "lastWeek" | "custom"
- `startDate`: "YYYY-MM-DD" (required if filter="custom")
- `endDate`: "YYYY-MM-DD" (required if filter="custom")

---

## 2. REQUEST EXAMPLES

### 2.1 Get This Week's Earnings
```
POST /agency/earnings
{
  "filter": "thisWeek"
}
```

### 2.2 Get Last Week's Earnings
```
POST /agency/earnings
{
  "filter": "lastWeek"
}
```

### 2.3 Get Custom Date Range Earnings
```
POST /agency/earnings
{
  "filter": "custom",
  "startDate": "2025-09-20",
  "endDate": "2025-09-27"
}
```

### 2.4 Default (This Week if No Filter)
```
POST /agency/earnings
{
  "filter": "thisWeek"
}
```

---

## 3. RESPONSE STRUCTURE

### 3.1 Success Response
```json
{
  "success": true,
  "data": {
    "range": "2025-09-20 to 2025-09-27",
    "results": [
      {
        "femaleId": "6954d27beb163b2d78ebd8f2",
        "name": "Female A",
        "profileImage": "https://res.cloudinary.com/...jpg",
        "score": 1250,
        "dailyScore": 15,
        "weeklyScore": 85,
        "earnings": 5555.5,
        "time": 5.5,
        "walletBalance": 2500.00
      }
    ]
  }
}
```

### 3.2 Empty Response (No Earnings)
```json
{
  "success": true,
  "data": {
    "range": "2025-09-20 to 2025-09-27",
    "results": []
  }
}
```

---

## 4. RESPONSE FIELDS

### 4.1 data.range
- String: Date range in format "YYYY-MM-DD to YYYY-MM-DD"

### 4.2 results[] (Array)
- Array of female users with their earnings

### 4.3 Individual Female Object
- `femaleId`: MongoDB ObjectId of the female user
- `name`: Full name (firstName + lastName)
- `profileImage`: Profile image URL or null
- `score`: Lifetime total score of the female user
- `dailyScore`: Daily score for the female user
- `weeklyScore`: Weekly score for the female user
- `earnings`: Total coins earned in the date range (2 decimal places)
- `time`: Total call time in hours (1 decimal place)
- `walletBalance`: Current wallet balance of the female user

---

## 5. BUSINESS LOGIC

### 5.1 Data Sources
- **Ownership**: `FemaleUser.referredByAgency` array
- **Earnings**: `CallHistory.femaleEarning` field
- **Time**: `CallHistory.duration` field (seconds → hours)
- **Date Filtering**: `CallHistory.createdAt`

### 5.2 Aggregation Logic
```
For each female in agency's referred list:
  Sum all CallHistory.femaleEarning where:
    - receiverId matches female._id
    - createdAt in date range
    - status = 'completed'
```

### 5.3 Security Rules
- Only shows females with `referredByAgency` containing agency ID
- Only includes completed calls (`status: 'completed'`)
- No wallet balances or private data exposed

---

## 6. IMPLEMENTATION DETAILS

### 6.1 Date Range Resolution
- **thisWeek**: Sunday to current date
- **lastWeek**: Last week's Sunday to Saturday
- **custom**: startDate to endDate (inclusive)
- **default**: This week if no valid filter provided

### 6.2 Time Conversion
```
timeHours = totalSeconds / 3600
rounded to 1 decimal place
```

### 6.3 Coin Precision
```
earningCoins rounded to 2 decimal places
using Math.round(value * 100) / 100
```

### 6.4 Database Aggregation
- Uses MongoDB aggregation pipeline
- Efficient grouping by female user
- Only completed calls included

---

## 7. TESTING SCENARIOS

### 7.1 Happy Path - Agency with Referred Females
1. Agency has 3 referred females
2. All females have completed calls in date range
3. API returns earnings for all 3 females

### 7.2 No Referred Females
1. Agency has no referred females
2. API returns empty results array

### 7.3 No Earnings in Date Range
1. Agency has referred females
2. No calls completed in date range
3. API returns females with 0 earnings

### 7.4 Custom Date Range
1. User provides custom start/end dates
2. API filters calls within date range
3. Results calculated for that period only

### 7.5 This Week Filter
1. User requests this week's earnings
2. API calculates Sunday to current date
3. Results aggregated for current week

### 7.6 Last Week Filter
1. User requests last week's earnings
2. API calculates last Sunday to Saturday
3. Results aggregated for previous week

---

## 8. UI INTEGRATION

### 8.1 Dashboard Display
- Show date range at top: "20 Sep to 27 Sep"
- List each female with:
  - Profile thumbnail
  - Name
  - Total earnings (coins)
  - Total time (hours)

### 8.2 Filtering Options
- "This Week" button
- "Last Week" button  
- "Custom Range" with date pickers

---

## 9. SECURITY & VALIDATION

### 9.1 Authentication
- Requires valid JWT token
- Validates agency user identity

### 9.2 Authorization
- Requires `requireReviewAccepted` middleware
- Only approved agencies can access

### 9.3 Data Security
- Only shows females with matching `referredByAgency`
- No other agency's data accessible
- No private profile data exposed

---

## 10. PERFORMANCE CONSIDERATIONS

### 10.1 Database Indexes
- Uses `CallHistory` indexes for efficient queries
- `createdAt` index for date filtering
- `receiverId` index for female matching

### 10.2 Aggregation Pipeline
- Efficient grouping by female user
- Single database operation for all calculations
- Scales to thousands of calls

### 10.3 Memory Usage
- Processes data in database
- Minimal memory footprint in application
- Returns only required fields

---

## 11. ERROR HANDLING

### 11.1 Server Error
```json
{
  "success": false,
  "error": "Error message details"
}
```

### 11.2 Invalid Date Range
- Invalid dates return empty results
- Malformed dates handled gracefully

---

## 12. BUSINESS RULES

✅ **Agency sees only referred females**: Filtered by `referredByAgency` array
✅ **Earnings from call logs**: Calculated from `CallHistory.femaleEarning`
✅ **Time from call duration**: Calculated from `CallHistory.duration`
✅ **No private data**: No wallet balances or KYC exposed
✅ **Completed calls only**: Only `status: 'completed'` included
✅ **Date range filtering**: Supports multiple time periods
✅ **Audit-safe**: Direct from transaction logs, not wallet balances

---

## 13. USE CASES

### 13.1 Agency Dashboard
- "How much did my referred creators earn this week?"
- "Which creators are performing best?"

### 13.2 Performance Tracking
- Track earnings over time
- Compare female performance
- Monitor agency success

### 13.3 Commission Planning
- Estimate potential agency earnings
- Track growth of referred creators
- Performance-based decisions

This API provides agencies with clear visibility into their referred creators' performance while maintaining security and privacy!