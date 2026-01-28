// src/controllers/agencyControllers/myWithdrawalsController.js
const WithdrawalRequest = require('../../models/common/WithdrawalRequest');
const AdminConfig = require('../../models/admin/AdminConfig');
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