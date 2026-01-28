# Weekly Level Assignment Cron Job

## Overview

The Weekly Level Assignment Cron Job is an automated system that runs weekly to assign appropriate levels to female users based on their weekly earnings. This system ensures that users are placed in the correct level tier according to their performance, which directly affects their call rates and platform margins.

## File Location

```
src/jobs/levelAssignmentJob.js
```

## Complete Code

```javascript
const FemaleUser = require('../models/femaleUser/FemaleUser');
const AdminLevelConfig = require('../models/admin/AdminLevelConfig');
const CallHistory = require('../models/common/CallHistory');

/**
 * Weekly level assignment job
 * Automatically assigns levels to female users based on their weekly earnings
 */

// Validate that level ranges don't overlap and don't have gaps
const validateLevelRanges = (levelConfigs) => {
  if (levelConfigs.length === 0) return;
  
  // Sort by weeklyEarningsMin
  const sortedConfigs = [...levelConfigs].sort((a, b) => a.weeklyEarningsMin - b.weeklyEarningsMin);
  
  for (let i = 0; i < sortedConfigs.length - 1; i++) {
    const current = sortedConfigs[i];
    const next = sortedConfigs[i + 1];
    
    // Check for overlap - ranges overlap if currentMax >= nextMin
    // Valid: Level 1: 0-1000, Level 2: 1001-2000 (boundary at 1000 and 1001 - no overlap)
    // Invalid: Level 1: 0-1000, Level 2: 1000-2000 (boundary at 1000 and 1000 - overlap)
    if (current.weeklyEarningsMax >= next.weeklyEarningsMin) {
      throw new Error(
        `Overlapping level ranges detected: Level ${current.level} (${current.weeklyEarningsMin}-${current.weeklyEarningsMax}) ` +
        `overlaps with Level ${next.level} (${next.weeklyEarningsMin}-${next.weeklyEarningsMax})`
      );
    }
    
    // Check for gaps (optional, could be acceptable depending on business logic)
    // Gap exists if there's a range of earnings that doesn't belong to any level
    // Example: Level 1: 0-1000, Level 2: 1002-2000 (gap at 1001)
    if (current.weeklyEarningsMax + 1 < next.weeklyEarningsMin) {
      console.warn(
        `Gap detected between Level ${current.level} (up to ${current.weeklyEarningsMax}) ` +
        `and Level ${next.level} (starting from ${next.weeklyEarningsMin}). ` +
        `Users with earnings in this range (${current.weeklyEarningsMax + 1} to ${next.weeklyEarningsMin - 1}) will stay at default level.`
      );
    }
  }
};

const assignWeeklyLevels = async () => {
  console.log('Starting weekly level assignment...');
  
  try {
    // Get all active level configurations
    const levelConfigs = await AdminLevelConfig.find({ isActive: true }).sort({ level: 1 });
    
    if (levelConfigs.length === 0) {
      console.log('No active level configurations found');
      return { success: false, message: 'No active level configurations found' };
    }
    
    // Validate level ranges to prevent admin configuration errors
    validateLevelRanges(levelConfigs);
    
    // Get all female users
    const femaleUsers = await FemaleUser.find({});
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of femaleUsers) {
      try {
        // Calculate weekly earnings for the user
        const weeklyEarnings = await calculateWeeklyEarnings(user._id);
        
        // Find the appropriate level based on weekly earnings
        let newLevel = 1; // Default to level 1 if no match found
        
        for (const config of levelConfigs) {
          if (weeklyEarnings >= config.weeklyEarningsMin && weeklyEarnings <= config.weeklyEarningsMax) {
            newLevel = config.level;
            break;
          }
        }
        
        // Update user's level and weekly earnings if changed
        const levelChanged = user.currentLevel !== newLevel;
        const earningsChanged = user.weeklyEarnings !== weeklyEarnings;
        
        if (levelChanged || earningsChanged) {
          // Update the user's level and weekly earnings only
          user.currentLevel = newLevel;
          user.weeklyEarnings = weeklyEarnings;
          
          // Set the timestamp for when the level was last evaluated
          user.lastLevelEvaluatedAt = new Date();
          
          // Reset weekly earnings to 0 if level changed (to prevent instant level jumping)
          if (levelChanged) {
            user.weeklyEarnings = 0;
          }
          
          await user.save();
          updatedCount++;
          
          console.log(`Updated user ${user._id} level to ${newLevel}, weekly earnings: ${weeklyEarnings}`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user._id}:`, userError);
        errorCount++;
      }
    }
    
    console.log(`Weekly level assignment completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
    return { 
      success: true, 
      updatedCount, 
      errorCount,
      message: `Weekly level assignment completed. Updated: ${updatedCount}, Errors: ${errorCount}` 
    };
    
  } catch (error) {
    console.error('Error in weekly level assignment:', error);
    return { success: false, error: error.message };
  }
};

// Calculate weekly earnings for a user
const calculateWeeklyEarnings = async (userId) => {
  const now = new Date();
  // Calculate the previous complete week (not current week)
  // Start from the beginning of the previous week
  const startOfPreviousWeek = new Date(now);
  startOfPreviousWeek.setDate(now.getDate() - now.getDay() - 7); // Start of previous week (Sunday)
  startOfPreviousWeek.setHours(0, 0, 0, 0);

  const endOfPreviousWeek = new Date(startOfPreviousWeek);
  endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 7);
  endOfPreviousWeek.setHours(0, 0, 0, 0);

  const earnings = await CallHistory.aggregate([
    {
      $match: {
        receiverId: userId,
        createdAt: { $gte: startOfPreviousWeek, $lt: endOfPreviousWeek },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$femaleEarning' }
      }
    }
  ]);

  return earnings.length > 0 ? earnings[0].totalEarnings : 0;
};

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--run')) {
  assignWeeklyLevels()
    .then(result => {
      console.log('Job result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
} else {
  console.log('Usage: node levelAssignmentJob.js [--run]');
  console.log('  --run: Execute the weekly level assignment job');
}

module.exports = {
  assignWeeklyLevels,
  calculateWeeklyEarnings
};
```

## How It Works

### 1. Job Execution Flow

1. **Initialization**: The job starts by fetching all active level configurations from the database
2. **User Retrieval**: All female users are retrieved from the database
3. **Earnings Calculation**: For each user, their earnings from the previous complete week are calculated
4. **Level Determination**: The appropriate level is determined based on the user's earnings and level configuration ranges
5. **Update Process**: User's level, earnings, and call rates are updated if they have changed
6. **Logging**: Results are logged for monitoring and debugging

### 2. Weekly Earnings Calculation

The system calculates earnings for the **previous complete week** (Sunday to Saturday), not the current week:
- `startOfPreviousWeek`: Beginning of the previous week (Sunday 00:00:00)
- `endOfPreviousWeek`: End of the previous week (next Sunday 00:00:00)
- Only completed calls (`status: 'completed'`) are counted
- Uses MongoDB aggregation to sum up `femaleEarning` from `CallHistory`

### 3. Level Assignment Logic

For each user:
1. Calculate their weekly earnings from the previous week
2. Compare earnings against level configuration ranges (`weeklyEarningsMin` to `weeklyEarningsMax`)
3. Assign the first matching level (higher priority to lower level numbers if there are overlaps)
4. Update the user's `currentLevel` and `weeklyEarnings` only
5. If the level changed, reset `weeklyEarnings` to 0 to prevent instant level jumping

### 4. Rate Synchronization

When a user's level changes:
- **The cron job only updates the level and weekly earnings**
- **Call rates are NOT updated in the cron job** to avoid UI mismatches
- **Rates are synced separately via PATCH when the user logs in** (using the female-user/level-info endpoint)

This approach:
- Prevents silent UI mismatches
- Keeps the frontend aware of rate changes
- Maintains consistency between backend and frontend

### 5. Optional Improvements

The cron job includes two optional improvements for better admin visibility and data safety:

#### 5.1. Audit Trail (`lastLevelEvaluatedAt`)

- **Field**: `lastLevelEvaluatedAt` is set to current timestamp when a user's level is evaluated
- **Purpose**: Provides audit trail for admin debugging and support transparency
- **Usage**: Admins can see when each user's level was last evaluated

#### 5.2. Admin Configuration Safety (`validateLevelRanges`)

- **Function**: Validates that level ranges don't overlap and don't have gaps
- **Purpose**: Prevents admin configuration errors that could cause incorrect level assignments
- **Validation**: Checks for overlapping ranges and warns about gaps between level ranges

## Running the Cron Job

### Method 1: Direct Execution (for testing)

```bash
node src/jobs/levelAssignmentJob.js --run
```

### Method 2: Scheduled Execution (Production)

The job is scheduled in `src/server.js` using node-cron:

```javascript
const cron = require('node-cron');
const { assignWeeklyLevels } = require('./jobs/levelAssignmentJob');

// Schedule weekly level assignment (runs every Sunday at 11:59 PM)
cron.schedule('59 23 * * 0', async () => {
  console.log('Running weekly level assignment job...');
  try {
    const result = await assignWeeklyLevels();
    console.log('Weekly level assignment job completed:', result);
  } catch (error) {
    console.error('Error running weekly level assignment job:', error);
  }
}, {
  timezone: "Asia/Kolkata" // Adjust timezone as needed
});
```

### Method 3: Manual Execution via API (Optional)

You can create an admin API endpoint to trigger the job manually:

```javascript
// In admin routes
router.post('/trigger-weekly-level-assignment', auth, dynamicPermissionCheck, async (req, res) => {
  try {
    const result = await assignWeeklyLevels();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Configuration Requirements

### AdminLevelConfig Schema Requirements

For the job to work correctly, the `AdminLevelConfig` must have:
- `level`: Number (unique level identifier)
- `weeklyEarningsMin`: Number (minimum earnings for this level)
- `weeklyEarningsMax`: Number (maximum earnings for this level)
- `audioRatePerMinute`: Number (fixed audio rate for this level)
- `videoRatePerMinute`: Number (fixed video rate for this level)
- `isActive`: Boolean (whether this level config is active)

### Example Configuration

```json
[
  {
    "level": 1,
    "weeklyEarningsMin": 0,
    "weeklyEarningsMax": 1000,
    "audioRatePerMinute": 60,
    "videoRatePerMinute": 80,
    "platformMarginPerMinute": {
      "nonAgency": 10,
      "agency": 20
    },
    "isActive": true
  },
  {
    "level": 2,
    "weeklyEarningsMin": 1001,
    "weeklyEarningsMax": 2500,
    "audioRatePerMinute": 80,
    "videoRatePerMinute": 120,
    "platformMarginPerMinute": {
      "nonAgency": 12,
      "agency": 22
    },
    "isActive": true
  }
]
```

## Error Handling

### Individual User Errors
- Each user is processed independently
- If one user fails, the job continues with other users
- Errors are logged but don't stop the entire process

### System Errors
- Database connection issues are caught and logged
- Missing level configurations result in job failure
- Memory issues are handled by Node.js process management

## Logging and Monitoring

### Console Output
- Start and completion messages
- Count of updated users
- Count of errors encountered
- Individual user updates (when level/earnings change)

### Expected Output
```
Starting weekly level assignment...
Updated user 507f1f77bcf86cd799439011 level to 2, weekly earnings: 1500
Weekly level assignment completed. Updated: 5, Errors: 0
Job result: { success: true, updatedCount: 5, errorCount: 0, message: 'Weekly level assignment completed. Updated: 5, Errors: 0' }
```

## Best Practices

### 1. Scheduling
- Run after the week ends (e.g., Sunday 11:59 PM) to ensure complete data
- Use appropriate timezone (Asia/Kolkata for Indian users)
- Consider server load when scheduling

### 2. Performance
- The job processes all users sequentially
- For large user bases, consider pagination or parallel processing
- Monitor execution time and optimize if needed

### 3. Data Consistency
- The job updates both level and rates atomically
- Weekly earnings are recalculated each time, ensuring accuracy
- Only completed calls are counted, preventing incomplete data issues

### 4. Monitoring
- Monitor the execution logs regularly
- Set up alerts for job failures
- Track the number of users updated per run
- Verify that level assignments are reasonable

## Troubleshooting

### Common Issues

1. **No Level Configurations Found**
   - Cause: No active level configurations in the database
   - Solution: Create level configurations using the admin API

2. **All Users Staying at Level 1**
   - Cause: Level ranges don't match user earnings, or earnings calculation is incorrect
   - Solution: Check level configuration ranges and verify CallHistory data

3. **Job Taking Too Long**
   - Cause: Large number of users
   - Solution: Consider optimizing the database queries or adding pagination

4. **Incorrect Earnings Calculation**
   - Cause: Wrong date range or missing completed calls
   - Solution: Verify the date calculation logic and CallHistory status values

### Debugging Steps

1. Check the console output for error messages
2. Verify level configurations exist and are active
3. Confirm CallHistory contains completed calls with proper dates
4. Test with a single user manually if needed
5. Check database connection and permissions