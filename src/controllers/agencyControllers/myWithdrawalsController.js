// src/controllers/agencyControllers/myWithdrawalsController.js
const WithdrawalRequest = require('../../models/common/WithdrawalRequest');
const AdminConfig = require('../../models/admin/AdminConfig');
const AgencyUser = require('../../models/agency/AgencyUser');
const { resolveDateRange } = require('../../utils/dateUtils');

exports.getMyWithdrawals = async (req, res) => {
  try {
    const agencyId = req.user._id;
    const { startDate, endDate } = req.body;

    // ✅ Smart date resolution (aligned with Figma)
    const { start, end } = resolveDateRange(startDate, endDate);

    const adminConfig = await AdminConfig.findOne();
    const rate = adminConfig?.coinToRupeeConversionRate || 1; // Default to 1 if not set

    const withdrawals = await WithdrawalRequest.find({
      userType: 'agency',
      userId: agencyId,
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    const result = withdrawals.map(w => ({
      rupees: w.amountInRupees,
      time: w.createdAt,
      status: w.status,
      payoutMethod: w.payoutMethod
    }));

    return res.json({
      success: true,
      data: {
        range: {
          start,
          end
        },
        withdrawals: result
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get agency's total coins and converted rupees
exports.getTotalCoinsAndRupees = async (req, res) => {
  try {
    const agencyId = req.user._id;
    
    // Get agency user to get wallet balance
    const agencyUser = await AgencyUser.findById(agencyId);
    if (!agencyUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agency user not found' 
      });
    }
    
    const totalCoins = agencyUser.walletBalance || 0;
    
    // Get conversion rate from admin config
    const adminConfig = await AdminConfig.findOne();
    // If 5 coins = 1 rupee, then conversion rate is 1/5 = 0.2
    const conversionRate = adminConfig?.coinToRupeeConversionRate ? 
                          (1 / adminConfig.coinToRupeeConversionRate) : 
                          0.2; // Default to 0.2 (5 coins = 1 rupee)
    
    const convertedRupees = totalCoins * conversionRate;
    
    return res.json({
      success: true,
      data: {
        totalCoins: totalCoins,
        convertedRupees: parseFloat(convertedRupees.toFixed(2)),
        conversionRate: conversionRate
      }
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};