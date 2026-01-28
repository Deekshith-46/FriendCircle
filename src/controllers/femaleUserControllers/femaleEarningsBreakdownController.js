const CallHistory = require('../../models/common/CallHistory');
const GiftReceived = require('../../models/femaleUser/GiftReceived');
const Transaction = require('../../models/common/Transaction');
const MaleUser = require('../../models/maleUser/MaleUser');

/**
 * Get earnings breakdown per male user for a female user
 */
exports.getEarningsBreakdownPerMale = async (req, res) => {
  try {
    const femaleId = req.user._id;

    // Get all call earnings grouped by male user
    const callEarnings = await CallHistory.aggregate([
      {
        $match: {
          receiverId: femaleId,
          status: 'completed' // Only completed calls count
        }
      },
      {
        $group: {
          _id: '$callerId',
          totalCalls: { $sum: 1 },
          totalCallEarnings: { $sum: '$femaleEarning' }
        }
      },
      {
        $project: {
          _id: 1,
          totalCalls: 1,
          totalCallEarnings: 1
        }
      }
    ]);

    // Get all gift earnings grouped by male user from GiftReceived table
    const giftEarnings = await GiftReceived.aggregate([
      {
        $match: {
          receiverId: femaleId
        }
      },
      {
        $group: {
          _id: '$senderId',
          totalGifts: { $sum: 1 },
          totalGiftEarnings: { $sum: '$coinsSpent' }
        }
      },
      {
        $project: {
          _id: 1,
          totalGifts: 1,
          totalGiftEarnings: 1
        }
      }
    ]);

    // Create maps for easy lookup
    const callEarningsMap = {};
    callEarnings.forEach(item => {
      callEarningsMap[item._id.toString()] = {
        callCoins: item.totalCallEarnings || 0,
        calls: item.totalCalls || 0
      };
    });

    const giftEarningsMap = {};
    giftEarnings.forEach(item => {
      giftEarningsMap[item._id.toString()] = {
        giftCoins: item.totalGiftEarnings || 0,
        gifts: item.totalGifts || 0
      };
    });

    // Currently no tip earnings (only calls and gifts)
    const tipEarningsMap = {};

    // Get unique male user IDs from all sources
    const allMaleIds = new Set();
    callEarnings.forEach(item => allMaleIds.add(item._id.toString()));
    giftEarnings.forEach(item => allMaleIds.add(item._id.toString()));
    // tipEarnings.forEach(item => allMaleIds.add(item._id.toString())); // No tip earnings for now

    // Fetch male user details
    const maleUsers = await MaleUser.find({
      _id: { $in: Array.from(allMaleIds).map(id => typeof id === 'string' ? require('mongoose').Types.ObjectId(id) : id) }
    }).select('_id firstName lastName email');

    // Build the response
    const earningsBreakdown = maleUsers.map(maleUser => {
      const maleId = maleUser._id.toString();
      
      const callData = callEarningsMap[maleId] || { callCoins: 0, calls: 0 };
      const giftData = giftEarningsMap[maleId] || { giftCoins: 0, gifts: 0 };
      const tipData = tipEarningsMap[maleId] || { tipCoins: 0, tips: 0 };
      
      const totalEarnings = callData.callCoins + giftData.giftCoins + tipData.tipCoins;

      return {
        maleUser: {
          _id: maleUser._id,
          name: `${maleUser.firstName || ''} ${maleUser.lastName || ''}`.trim(),
          email: maleUser.email
        },
        earnings: {
          total: totalEarnings,
          calls: callData.calls,
          callCoins: callData.callCoins,
          gifts: giftData.gifts,
          giftCoins: giftData.giftCoins,
          tips: tipData.tips,
          tipCoins: tipData.tipCoins
        }
      };
    });

    // Sort by total earnings descending
    earningsBreakdown.sort((a, b) => b.earnings.total - a.earnings.total);

    res.json({
      success: true,
      data: earningsBreakdown
    });

  } catch (error) {
    console.error('Error in getEarningsBreakdownPerMale:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Get earnings breakdown for a specific male user
 */
exports.getEarningsBreakdownForMale = async (req, res) => {
  try {
    const femaleId = req.user._id;
    const { maleId } = req.params;

    // Validate maleId
    if (!require('mongoose').Types.ObjectId.isValid(maleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid male user ID'
      });
    }

    // Get call earnings from specific male
    const callEarnings = await CallHistory.aggregate([
      {
        $match: {
          receiverId: femaleId,
          callerId: typeof maleId === 'string' ? require('mongoose').Types.ObjectId(maleId) : maleId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalCallEarnings: { $sum: '$femaleEarning' }
        }
      }
    ]);

    // Get gift earnings from specific male
    const giftEarnings = await GiftReceived.aggregate([
      {
        $match: {
          receiverId: femaleId,
          senderId: typeof maleId === 'string' ? require('mongoose').Types.ObjectId(maleId) : maleId
        }
      },
      {
        $group: {
          _id: null,
          totalGifts: { $sum: 1 },
          totalGiftEarnings: { $sum: '$coinsSpent' }
        }
      }
    ]);

    // Get male user details
    const maleUser = await MaleUser.findById(maleId).select('_id firstName lastName email');

    if (!maleUser) {
      return res.status(404).json({
        success: false,
        message: 'Male user not found'
      });
    }

    const callData = callEarnings[0] || { totalCallEarnings: 0, totalCalls: 0 };
    const giftData = giftEarnings[0] || { totalGiftEarnings: 0, totalGifts: 0 };
    const tipData = { tipCoins: 0, tips: 0 }; // No tip earnings for now

    const totalEarnings = callData.totalCallEarnings + giftData.totalGiftEarnings + tipData.tipCoins;

    res.json({
      success: true,
      data: {
        maleUser: {
          _id: maleUser._id,
          name: `${maleUser.firstName || ''} ${maleUser.lastName || ''}`.trim(),
          email: maleUser.email
        },
        earnings: {
          total: totalEarnings,
          calls: callData.totalCalls,
          callCoins: callData.totalCallEarnings,
          gifts: giftData.totalGifts,
          giftCoins: giftData.totalGiftEarnings,
          tips: tipData.tips,
          tipCoins: tipData.tipCoins
        }
      }
    });

  } catch (error) {
    console.error('Error in getEarningsBreakdownForMale:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};