const AdminRewardRule = require('../models/admin/AdminRewardRule');
const ScoreHistory = require('../models/common/ScoreHistory');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const CallHistory = require('../models/common/CallHistory');
const { getStartOfDay, getEndOfDay, normalizeDate, getStartOfWeek } = require('../utils/dateUtils');

/**
 * Apply DAILY LOGIN reward immediately on user login
 * @param {String} femaleUserId - Female user ID
 */
exports.applyDailyLoginReward = async (femaleUserId) => {
  try {
    // Get active daily login rule
    const rule = await AdminRewardRule.findOne({
      ruleType: 'DAILY_LOGIN',
      isActive: true
    });
    
    if (!rule) {
      console.log('No active DAILY_LOGIN rule found');
      return;
    }

    const startOfDay = getStartOfDay();
    const normalizedDate = normalizeDate(startOfDay);

    // Idempotency check - prevent duplicate rewards
    const alreadyGiven = await ScoreHistory.exists({
      femaleUserId,
      ruleType: 'DAILY_LOGIN',
      referenceDate: normalizedDate
    });
    
    if (alreadyGiven) {
      console.log(`Daily login reward already given today for user ${femaleUserId}`);
      return;
    }

    // Apply score to user
    await FemaleUser.updateOne(
      { _id: femaleUserId },
      {
        $inc: {
          score: rule.scoreValue,
          dailyScore: rule.scoreValue,
          weeklyScore: rule.scoreValue
        }
      }
    );

    // Log in ScoreHistory
    await ScoreHistory.create({
      femaleUserId,
      ruleType: 'DAILY_LOGIN',
      scoreAdded: rule.scoreValue,
      referenceDate: normalizedDate,
      ruleId: rule._id,
      addedBy: 'system'
    });

    console.log(`Applied daily login reward: ${rule.scoreValue} points to user ${femaleUserId}`);
    
  } catch (err) {
    console.error(`Error applying daily login reward for user ${femaleUserId}:`, err);
  }
};

/**
 * Apply AUDIO / VIDEO CALL TARGET rewards immediately on call completion
 * @param {String} femaleUserId - Female user ID (receiver)
 * @param {String} callType - 'audio' or 'video'
 * @param {String} currentCallId - ID of the call that just completed (to avoid double counting)
 */
exports.applyCallTargetReward = async (femaleUserId, callType, currentCallId) => {
  try {
    const ruleType = callType === 'audio' 
      ? 'DAILY_AUDIO_CALL_TARGET' 
      : 'DAILY_VIDEO_CALL_TARGET';

    // Get active rule for this call type
    const rule = await AdminRewardRule.findOne({
      ruleType,
      isActive: true
    });
    
    if (!rule) {
      console.log(`No active ${ruleType} rule found`);
      return;
    }

    const startOfDay = getStartOfDay();
    const endOfDay = getEndOfDay();
    const normalizedDate = normalizeDate(startOfDay);

    // Idempotency check - prevent duplicate rewards
    const alreadyGiven = await ScoreHistory.exists({
      femaleUserId,
      ruleType,
      referenceDate: normalizedDate
    });
    
    if (alreadyGiven) {
      console.log(`${ruleType} reward already given today for user ${femaleUserId}`);
      return;
    }

    // Count completed calls TODAY where user was RECEIVER
    // Exclude current call to avoid double counting, then add 1
    const callCount = (await CallHistory.countDocuments({
      receiverId: femaleUserId,
      callType,
      status: 'completed',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      _id: { $ne: currentCallId } // exclude current call
    })) + 1;

    // Check if target met
    if (callCount < rule.minCount) {
      console.log(`Call target not met: ${callCount}/${rule.minCount} ${callType} calls for user ${femaleUserId}`);
      return;
    }

    // Apply score to user
    await FemaleUser.updateOne(
      { _id: femaleUserId },
      {
        $inc: {
          score: rule.scoreValue,
          dailyScore: rule.scoreValue,
          weeklyScore: rule.scoreValue
        }
      }
    );

    // Log in ScoreHistory
    await ScoreHistory.create({
      femaleUserId,
      ruleType,
      scoreAdded: rule.scoreValue,
      referenceDate: normalizedDate,
      ruleId: rule._id,
      addedBy: 'system'
    });

    console.log(`Applied ${ruleType} reward: ${rule.scoreValue} points to user ${femaleUserId} (${callCount} calls)`);
    
  } catch (err) {
    console.error(`Error applying call target reward for user ${femaleUserId}:`, err);
  }
};

/**
 * Apply WEEKLY CONSISTENCY reward (called by cron only)
 * @param {String} femaleUserId - Female user ID
 * @param {Number} consecutiveDays - Current consecutive active days
 */
exports.applyWeeklyConsistencyReward = async (femaleUserId, consecutiveDays) => {
  try {
    const rule = await AdminRewardRule.findOne({
      ruleType: 'WEEKLY_CONSISTENCY',
      isActive: true
    });
    
    if (!rule) {
      console.log('No active WEEKLY_CONSISTENCY rule found');
      return;
    }

    // Check if requirement met
    if (consecutiveDays < rule.requiredDays) {
      console.log(`Weekly consistency requirement not met: ${consecutiveDays}/${rule.requiredDays} days for user ${femaleUserId}`);
      return;
    }

    const startOfWeek = getStartOfWeek();
    const normalizedDate = normalizeDate(startOfWeek);

    // Idempotency check
    const alreadyGiven = await ScoreHistory.exists({
      femaleUserId,
      ruleType: 'WEEKLY_CONSISTENCY',
      referenceDate: normalizedDate
    });
    
    if (alreadyGiven) {
      console.log(`Weekly consistency reward already given this week for user ${femaleUserId}`);
      return;
    }

    // Apply score to user (weekly and total only)
    await FemaleUser.updateOne(
      { _id: femaleUserId },
      {
        $inc: {
          score: rule.scoreValue,
          weeklyScore: rule.scoreValue
        }
      }
    );

    // Log in ScoreHistory
    await ScoreHistory.create({
      femaleUserId,
      ruleType: 'WEEKLY_CONSISTENCY',
      scoreAdded: rule.scoreValue,
      referenceDate: normalizedDate,
      ruleId: rule._id,
      addedBy: 'system'
    });

    console.log(`Applied weekly consistency reward: ${rule.scoreValue} points to user ${femaleUserId} (${consecutiveDays} days)`);
    
  } catch (err) {
    console.error(`Error applying weekly consistency reward for user ${femaleUserId}:`, err);
  }
};