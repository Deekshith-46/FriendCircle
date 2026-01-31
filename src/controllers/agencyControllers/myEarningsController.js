// src/controllers/agencyControllers/myEarningsController.js
const AgencyUser = require('../../models/agency/AgencyUser');
const AdminConfig = require('../../models/admin/AdminConfig');
const CallHistory = require('../../models/common/CallHistory');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const { resolveDateRange } = require('../../utils/dateUtils');

    exports.getMyEarnings = async (req, res) => {
    try {
        const agencyId = req.user._id;
        const { startDate, endDate } = req.body;

        // 1️⃣ Get agency wallet balance
        const agency = await AgencyUser.findById(agencyId).select('walletBalance');

        // 2️⃣ Admin config
        const adminConfig = await AdminConfig.findOne();
        const rate = adminConfig?.coinToRupeeConversionRate || 1; // 5 coins = 1 rupee


        const totalRupees = 0; // Will be calculated after earnings are created

        // ✅ Smart date resolution (aligned with Figma)
        const { start, end } = resolveDateRange(startDate, endDate);

        // 4️⃣ Get referred females (using agency's stored list)
        const agencyData = await AgencyUser.findById(agencyId).populate({
          path: 'referredFemaleUsers',
          select: '_id firstName name'
        });
                
        const females = agencyData.referredFemaleUsers || [];
        
        

        const femaleMap = {};
        females.forEach(f => {
        femaleMap[f._id.toString()] = f;
        });

        const femaleIds = females.map(f => f._id);

        // 5️⃣ Call earnings (filter out zero-coin records)
        const calls = await CallHistory.find({
        receiverId: { $in: femaleIds },
        status: 'completed',
        agencyEarned: { $gt: 0 },  // 🔥 Filter zero-coin earnings
        createdAt: { $gte: start, $lte: end }
        }).select('receiverId agencyEarned createdAt');

        const earnings = calls.map(call => {
        const coins = call.agencyEarned || 0;

        return {
            coins,
            rupees: Number((coins / rate).toFixed(2)),
            femaleUser: {
            _id: call.receiverId,
            name: femaleMap[call.receiverId.toString()]?.name || femaleMap[call.receiverId.toString()]?.firstName || 'Unknown'
            },
            reason: 'Call commission',
            time: call.createdAt
        }
        });
        
        // Calculate total rupees from earnings
        const totalRupeesCalculated = earnings.reduce((sum, earning) => sum + earning.rupees, 0);

        return res.json({
        success: true,
        data: {
            range: {
            start,
            end
            },
            totalRupees: totalRupeesCalculated,
            conversionRate: rate,
            earnings
        }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
    };

    // Get agency total coins (wallet balance)
    exports.getTotalCoins = async (req, res) => {
    try {
        const agencyId = req.user._id;

        // Get agency wallet balance
        const agency = await AgencyUser.findById(agencyId).select('walletBalance');
        
        if (!agency) {
        return res.status(404).json({ success: false, message: 'Agency not found' });
        }

        const totalCoins = agency.walletBalance || 0;

        return res.json({
        success: true,
        data: {
            totalCoins
        }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
    };
