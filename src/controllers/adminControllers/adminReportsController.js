const CallHistory = require('../../models/common/CallHistory');
const AdminConfig = require('../../models/admin/AdminConfig');
const messages = require('../../validations/messages');

// Get admin earnings summary
exports.getAdminEarningsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query filter
    let filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }
    
    // Aggregate admin earnings
    const stats = await CallHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalMalePayments: { $sum: '$totalCoins' },
          totalFemaleEarnings: { $sum: '$femaleEarning' },
          totalPlatformMargin: { $sum: '$platformMargin' },
          totalAdminEarnings: { $sum: '$adminEarned' },
          totalAgencyEarnings: { $sum: '$agencyEarned' },
          totalSuccessfulCalls: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalFailedCalls: { $sum: { $cond: [{ $eq: ['$status', 'insufficient_coins'] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      totalDuration: 0,
      totalMalePayments: 0,
      totalFemaleEarnings: 0,
      totalPlatformMargin: 0,
      totalAdminEarnings: 0,
      totalAgencyEarnings: 0,
      totalSuccessfulCalls: 0,
      totalFailedCalls: 0
    };
    
    // Remove the _id field from result
    delete result._id;
    
    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Error getting admin earnings summary:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get detailed admin earnings breakdown
exports.getAdminEarningsBreakdown = async (req, res) => {
  try {
    const { limit = 50, skip = 0, startDate, endDate } = req.query;
    
    // Build query filter
    let filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }
    
    // Get detailed call records with populated user info
    const calls = await CallHistory.find(filter)
      .populate('callerId', 'firstName lastName email mobileNumber')
      .populate('receiverId', 'name email mobileNumber')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await CallHistory.countDocuments(filter);
    
    return res.json({
      success: true,
      data: calls,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    console.error('Error getting admin earnings breakdown:', err);
    return res.status(500).json({
      success: true,
      error: err.message
    });
  }
};

// Get admin earnings by date range
exports.getAdminEarningsByDate = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Define date grouping format based on groupBy parameter
    let dateGroupFormat;
    switch (groupBy) {
      case 'year':
        dateGroupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      case 'month':
        dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'week':
        dateGroupFormat = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
        break;
      case 'day':
      default:
        dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
    }
    
    const earningsByDate = await CallHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: dateGroupFormat,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalMalePayments: { $sum: '$totalCoins' },
          totalFemaleEarnings: { $sum: '$femaleEarning' },
          totalPlatformMargin: { $sum: '$platformMargin' },
          totalAdminEarnings: { $sum: '$adminEarned' },
          totalAgencyEarnings: { $sum: '$agencyEarned' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return res.json({
      success: true,
      data: earningsByDate
    });
  } catch (err) {
    console.error('Error getting admin earnings by date:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get agency earnings summary (for admin to monitor agency performance)
exports.getAgencyEarningsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query filter for agency calls only
    let filter = { isAgencyFemale: true };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }
    
    // Aggregate agency earnings
    const stats = await CallHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$receiverId', // Group by female user (agency member)
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalFemaleEarnings: { $sum: '$femaleEarning' },
          totalAgencyEarnings: { $sum: '$agencyEarned' }
        }
      },
      {
        $lookup: {
          from: 'femaleusers', // Collection name for FemaleUser model
          localField: '_id',
          foreignField: '_id',
          as: 'femaleUser'
        }
      },
      {
        $unwind: '$femaleUser'
      },
      {
        $project: {
          _id: 1,
          totalCalls: 1,
          totalDuration: 1,
          totalFemaleEarnings: 1,
          totalAgencyEarnings: 1,
          femaleName: '$femaleUser.name',
          femaleEmail: '$femaleUser.email'
        }
      }
    ]);
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error getting agency earnings summary:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};