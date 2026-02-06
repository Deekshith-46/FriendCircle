// src/services/notification/analyticsService.js
// Analytics service for tracking notification delivery and engagement

const Notification = require('../../models/common/Notification');

class NotificationAnalyticsService {
  // Track notification delivery metrics
  static async trackDeliveryMetrics(notificationId, deliveryResult) {
    try {
      // Determine if notification was delivered via any channel
      const socketDelivered = deliveryResult.socket?.delivered || false;
      const pushDelivered = deliveryResult.push?.some(p => p.success) || false;
      const isDelivered = socketDelivered || pushDelivered;
      
      // Update notification with delivery status
      await Notification.findByIdAndUpdate(notificationId, {
        $set: {
          isDelivered: isDelivered,
          deliveredAt: isDelivered ? new Date() : null,
          deliveryDetails: {
            socket: deliveryResult.socket,
            push: deliveryResult.push,
            overallDelivered: isDelivered
          }
        }
      });

      // Log metrics for analytics
      console.log('Notification delivery metrics tracked:', {
        notificationId,
        socketDelivered: socketDelivered,
        pushDelivered: pushDelivered,
        isOverallDelivered: isDelivered,
        pushSuccessCount: deliveryResult.push ? 
          deliveryResult.push.filter(r => r.success).length : 0,
        pushTotalCount: deliveryResult.push ? deliveryResult.push.length : 0
      });
    } catch (error) {
      console.error('Error tracking delivery metrics:', error);
    }
  }

  // Get notification statistics
  static async getNotificationStats(filters = {}) {
    try {
      const matchQuery = {};
      
      if (filters.startDate) {
        matchQuery.createdAt = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(filters.endDate) };
      }
      if (filters.type) {
        matchQuery.type = filters.type;
      }
      if (filters.receiverType) {
        matchQuery.receiverType = filters.receiverType;
      }
      if (filters.priority) {
        matchQuery.priority = filters.priority;
      }

      const stats = await Notification.aggregate([
        {
          $match: matchQuery
        },
        {
          $group: {
            _id: {
              type: '$type',
              receiverType: '$receiverType',
              priority: '$priority',
              isRead: '$isRead',
              isDelivered: '$isDelivered'
            },
            count: { $sum: 1 },
            avgAge: { $avg: { $subtract: [new Date(), '$createdAt'] } }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return [];
    }
  }

  // Get delivery rate statistics
  static async getDeliveryRates(filters = {}) {
    try {
      const matchQuery = {};
      
      if (filters.startDate) {
        matchQuery.createdAt = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(filters.endDate) };
      }
      if (filters.type) {
        matchQuery.type = filters.type;
      }
      if (filters.receiverType) {
        matchQuery.receiverType = filters.receiverType;
      }

      const totalNotifications = await Notification.countDocuments(matchQuery);
      const deliveredNotifications = await Notification.countDocuments({
        ...matchQuery,
        isDelivered: true
      });
      const readNotifications = await Notification.countDocuments({
        ...matchQuery,
        isRead: true
      });

      return {
        total: totalNotifications,
        delivered: deliveredNotifications,
        read: readNotifications,
        deliveryRate: totalNotifications > 0 ? (deliveredNotifications / totalNotifications) * 100 : 0,
        readRate: deliveredNotifications > 0 ? (readNotifications / deliveredNotifications) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting delivery rates:', error);
      return {
        total: 0,
        delivered: 0,
        read: 0,
        deliveryRate: 0,
        readRate: 0
      };
    }
  }

  // Get recent notification activity
  static async getRecentActivity(limit = 10) {
    try {
      const recentNotifications = await Notification.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('receiverId', 'name firstName lastName email')
        .select('title message type receiverType isRead isDelivered createdAt');

      return recentNotifications;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  // Get notification trends by day
  static async getDailyTrends(daysBack = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const trends = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              type: "$type"
            },
            count: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ["$isDelivered", true] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ["$isRead", true] }, 1, 0] } }
          }
        },
        {
          $group: {
            _id: "$_id.date",
            types: {
              $push: {
                type: "$_id.type",
                count: "$count",
                delivered: "$delivered",
                read: "$read"
              }
            },
            total: { $sum: "$count" },
            totalDelivered: { $sum: "$delivered" },
            totalRead: { $sum: "$read" }
          }
        },
        {
          $sort: { "_id": 1 }
        }
      ]);

      return trends;
    } catch (error) {
      console.error('Error getting daily trends:', error);
      return [];
    }
  }
}

module.exports = NotificationAnalyticsService;