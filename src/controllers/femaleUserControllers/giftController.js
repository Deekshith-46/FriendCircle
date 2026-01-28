const GiftReceived = require('../../models/femaleUser/GiftReceived');

// Get gifts received by the female user
exports.getReceivedGifts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    const gifts = await GiftReceived.find({ receiverId: userId })
      .populate('senderId', 'firstName lastName email')
      .populate('giftId', 'giftTitle imageUrl')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await GiftReceived.countDocuments({ receiverId: userId });

    return res.json({
      success: true,
      data: gifts,
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

// Get gift statistics for female user
exports.getGiftStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await GiftReceived.aggregate([
      { $match: { receiverId: userId } },
      {
        $group: {
          _id: null,
          totalGifts: { $sum: 1 },
          totalCoinsReceived: { $sum: '$coinsSpent' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalGifts: 0,
      totalCoinsReceived: 0
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