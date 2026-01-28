const mongoose = require('mongoose');

const CronLockSchema = new mongoose.Schema({
  jobName: { type: String, required: true, unique: true },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: String, default: null },
  lastRun: { type: Date, default: null }
}, { timestamps: true });

// Index for cleanup of stale locks
CronLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 3600 }); // 1 hour expiry

const CronLock = mongoose.model('CronLock', CronLockSchema);

/**
 * Acquire cron job lock with automatic cleanup
 * @param {String} jobName - Name of the cron job
 * @param {Number} timeoutMs - Lock timeout in milliseconds (default: 5 minutes)
 * @returns {Object|null} Lock object if acquired, null if failed
 */
exports.acquireLock = async (jobName, timeoutMs = 300000) => {
  try {
    const now = new Date();
    const lockTimeout = new Date(now.getTime() - timeoutMs);
    
    // Try to acquire lock using findOneAndUpdate with upsert
    const lock = await CronLock.findOneAndUpdate(
      {
        jobName: jobName,
        $or: [
          { lockedAt: null }, // Never locked
          { lockedAt: { $lt: lockTimeout } } // Stale lock
        ]
      },
      {
        $set: {
          lockedAt: now,
          lockedBy: process.pid.toString(),
          updatedAt: now
        }
      },
      {
        new: true,
        upsert: true,
        rawResult: true
      }
    );
    
    // Check if we actually got the lock
    if (lock.lastErrorObject?.updatedExisting) {
      // We updated an existing document - check if it was ours
      const updatedDoc = lock.value;
      return updatedDoc.lockedAt.getTime() === now.getTime() && 
             updatedDoc.lockedBy === process.pid.toString() ? updatedDoc : null;
    } else {
      // We created a new document - we have the lock
      return lock.value;
    }
  } catch (err) {
    console.error(`Failed to acquire lock for ${jobName}:`, err);
    return null;
  }
};

/**
 * Release cron job lock
 * @param {String} jobName - Name of the cron job
 */
exports.releaseLock = async (jobName) => {
  try {
    await CronLock.findOneAndUpdate(
      { jobName: jobName, lockedBy: process.pid.toString() },
      {
        $set: {
          lockedAt: null,
          lockedBy: null,
          lastRun: new Date()
        }
      }
    );
  } catch (err) {
    console.error(`Failed to release lock for ${jobName}:`, err);
  }
};

/**
 * Check if job ran today to prevent duplicate execution
 * @param {String} jobName - Name of the cron job
 * @returns {Boolean} True if job already ran today
 */
exports.didRunToday = async (jobName) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lock = await CronLock.findOne({ jobName });
    if (!lock || !lock.lastRun) return false;
    
    const lastRun = new Date(lock.lastRun);
    lastRun.setHours(0, 0, 0, 0);
    
    return lastRun.getTime() === today.getTime();
  } catch (err) {
    console.error(`Failed to check run status for ${jobName}:`, err);
    return false;
  }
};

// Named exports are used above - no need for default export