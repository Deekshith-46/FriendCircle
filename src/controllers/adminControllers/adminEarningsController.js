const AdminEarning = require('../../models/admin/AdminEarning');
const Transaction = require('../../models/common/Transaction');
const MaleUser = require('../../models/maleUser/MaleUser');
const AdminPackage = require('../../models/admin/Package');

// Get admin earnings summary
exports.getEarningsSummary = async (req, res) => {
  try {
    // Calculate total earnings
    const totalEarnings = await AdminEarning.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get earnings by source
    const earningsBySource = await AdminEarning.aggregate([
      {
        $group: {
          _id: '$source',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalEarnings: totalEarnings[0]?.total || 0,
        earningsBySource
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get detailed earnings history with pagination
exports.getEarningsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, source, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (source) {
      query.source = source;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const earnings = await AdminEarning.find(query)
      .populate('fromUserId', 'firstName lastName email')
      .populate('packageId', 'name amount coin')
      .populate('transactionId', 'paymentId orderId status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminEarning.countDocuments(query);

    res.json({
      success: true,
      data: earnings.map(earning => ({
        id: earning._id,
        source: earning.source,
        amount: earning.amount,
        fromUser: earning.fromUserId ? {
          id: earning.fromUserId._id,
          name: `${earning.fromUserId.firstName} ${earning.fromUserId.lastName}`,
          email: earning.fromUserId.email
        } : null,
        transaction: earning.transactionId ? {
          id: earning.transactionId._id,
          paymentId: earning.transactionId.paymentId,
          orderId: earning.transactionId.orderId,
          status: earning.transactionId.status
        } : null,
        package: earning.packageId ? {
          id: earning.packageId._id,
          name: earning.packageId.name,
          amount: earning.packageId.amount,
          coins: earning.packageId.coin
        } : null,
        metadata: earning.metadata,
        date: earning.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get earnings by date range
exports.getEarningsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate) matchQuery.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      matchQuery.createdAt = matchQuery.createdAt || {};
      matchQuery.createdAt.$lte = new Date(endDate);
    }

    const earningsByDate = await AdminEarning.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: earningsByDate.map(item => ({
        date: item._id,
        total: item.total,
        count: item.count
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get top earning users
exports.getTopEarningUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await AdminEarning.aggregate([
      {
        $group: {
          _id: '$fromUserId',
          userType: { $first: '$fromUserType' },
          totalEarnings: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalEarnings: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Populate user details
    const populatedUsers = await Promise.all(
      topUsers.map(async (user) => {
        let userDetails = null;
        if (user.userType === 'male') {
          userDetails = await MaleUser.findById(user._id).select('firstName lastName email');
        }
        return {
          ...user,
          userDetails: userDetails ? {
            id: userDetails._id,
            name: `${userDetails.firstName} ${userDetails.lastName}`,
            email: userDetails.email
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: populatedUsers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};