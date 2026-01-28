const FemaleUser = require('../../models/femaleUser/FemaleUser');
const ScoreHistory = require('../../models/common/ScoreHistory');

// Get all female users with their scores (for agency panel)
exports.getFemaleUsersWithScores = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'score', sortOrder = 'desc', period = 'thisWeek' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    let filter = { 
      status: 'active',
      reviewStatus: 'accepted'
    };
    
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    
    // Agencies can only see their own female users
    filter.referredByAgency = req.user._id;
    
    // Calculate date range based on period
    let dateRange = {};
    if (period === 'thisWeek') {
      const startOfWeek = getStartOfWeek(new Date());
      dateRange = { $gte: startOfWeek };
    } else if (period === 'lastWeek') {
      const now = new Date();
      const startOfThisWeek = getStartOfWeek(now);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfThisWeek);
      
      dateRange = {
        $gte: startOfLastWeek,
        $lt: endOfLastWeek
      };
    } else if (period === 'custom') {
      const { startDate, endDate } = req.query;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Make endDate inclusive
        
        dateRange = {
          $gte: start,
          $lte: end
        };
      }
    }
    
    // Single aggregation pipeline for true MongoDB-native solution
    const aggregationPipeline = [
      { $match: filter }
    ];
    
    // Add score lookup and calculation
    if (Object.keys(dateRange).length > 0) {
      aggregationPipeline.push(
        {
          $lookup: {
            from: "scorehistories",
            let: { userId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$femaleUserId", "$$userId"] },
                  createdAt: dateRange
                }
              },
              {
                $group: {
                  _id: null,
                  periodScore: { $sum: "$scoreAdded" }
                }
              }
            ],
            as: "scoreData"
          }
        },
        {
          $addFields: {
            periodScore: { $ifNull: [{ $first: "$scoreData.periodScore" }, 0] }
          }
        }
      );
    } else {
      // If no date range, set periodScore to 0
      aggregationPipeline.push({ $addFields: { periodScore: 0 } });
    }
    
    // Add sorting
    const sortField = sortBy === 'periodScore' ? 'periodScore' : sortBy;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    aggregationPipeline.push({ $sort: { [sortField]: sortDirection } });
    
    // Add pagination
    aggregationPipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );
    
    // Project only required fields
    aggregationPipeline.push(
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          score: 1,
          periodScore: 1,
          consecutiveActiveDays: 1,
          lastActiveDate: 1,
          totalOnlineMinutes: 1,
          walletBalance: 1,
          coinBalance: 1,
          createdAt: 1,
          scoreData: 0 // Remove temporary field
        }
      }
    );
    
    // Execute aggregation
    const paginatedUsers = await FemaleUser.aggregate(aggregationPipeline);
    
    // Get total count for pagination
    const total = await FemaleUser.countDocuments(filter);
    
    res.json({
      success: true,
      data: paginatedUsers,
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

// Helper function to get start of week (Monday)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Get a specific female user's scores
exports.getFemaleUserScores = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await FemaleUser.findById(userId)
      .select('name email score dailyScore weeklyScore consecutiveActiveDays lastActiveDate totalOnlineMinutes walletBalance coinBalance createdAt');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get female user's score history
exports.getFemaleUserScoreHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const history = await ScoreHistory.find({ femaleUserId: userId })
      .populate('ruleId', 'ruleType scoreValue')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ScoreHistory.countDocuments({ femaleUserId: userId });
    
    res.json({
      success: true,
      data: history,
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