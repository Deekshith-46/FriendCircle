// src/jobs/notificationCleanupJob.js
// Job to clean up old notifications periodically

const Notification = require('../models/common/Notification');
const cron = require('node-cron');
const { acquireLock, releaseLock } = require('../utils/cronLock');

class NotificationCleanupJob {
  constructor() {
    this.job = null;
  }

  // Cleanup notifications older than 30 days
  async cleanupOldNotifications(daysToKeep = 30) {
    if (!await acquireLock('notification_cleanup')) {
      console.log('Notification cleanup job already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    try {
      console.log(`Starting notification cleanup job for notifications older than ${daysToKeep} days...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Remove notifications older than cutoff date
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);

      return {
        success: true,
        deletedCount: result.deletedCount,
        cutoffDate: cutoffDate,
        message: `Successfully cleaned up ${result.deletedCount} notifications older than ${daysToKeep} days`
      };

    } catch (error) {
      console.error('Error in notification cleanup job:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await releaseLock('notification_cleanup');
    }
  }

  // Cleanup invalid FCM tokens
  async cleanupInvalidTokens() {
    // This function would typically be called when we detect invalid tokens
    // For now, we'll just log that this functionality exists
    console.log('FCM token cleanup functionality available');
  }

  // Schedule the job to run daily at 2 AM
  schedule() {
    this.job = cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled notification cleanup job...');
      await this.cleanupOldNotifications();
    });

    console.log('Notification cleanup job scheduled to run daily at 2 AM');
    return this.job;
  }

  stop() {
    if (this.job) {
      this.job.stop();
      console.log('Notification cleanup job stopped');
    }
  }
}

// Singleton instance
const notificationCleanupJob = new NotificationCleanupJob();

module.exports = {
  NotificationCleanupJob,
  notificationCleanupJob
};