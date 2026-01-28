const CallHistory = require('../../models/common/CallHistory');

// Get call earnings history for female user
exports.getCallEarnings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    const calls = await CallHistory.find({ 
      receiverId: userId,
      status: 'completed' 
    })
      .populate('callerId', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallHistory.countDocuments({ 
      receiverId: userId,
      status: 'completed' 
    });

    // Transform the call data to match the required format
    const transformedCalls = calls.map(call => {
      return {
        rating: (call.rating && call.rating.stars) ? call.rating.message : null,
        _id: call._id,
        callerId: call.callerId,
        callerType: call.callerType,
        receiverId: call.receiverId,
        receiverType: call.receiverType,
        billableDuration: call.billableDuration,
        femaleEarningPerMinute: call.femaleEarningPerMinute,
        isAgencyFemale: call.isAgencyFemale,
        callType: call.callType,
        status: call.status,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt,
        __v: call.__v
      };
    });

    return res.json({
      success: true,
      data: transformedCalls,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get call earnings statistics for female user
exports.getCallEarningsStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await CallHistory.aggregate([
      { $match: { receiverId: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalEarnings: { $sum: '$femaleEarning' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      totalDuration: 0,
      totalEarnings: 0
    };

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
