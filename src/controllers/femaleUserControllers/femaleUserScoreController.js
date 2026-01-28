const FemaleUser = require('../../models/femaleUser/FemaleUser');
const ScoreHistory = require('../../models/common/ScoreHistory');

// Get current user's scores
exports.getMyScores = async (req, res) => {
  try {
    const user = await FemaleUser.findById(req.user._id).select('score dailyScore weeklyScore consecutiveActiveDays lastActiveDate');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      data: {
        score: user.score,           // lifetime total
        dailyScore: user.dailyScore, // today's score
        weeklyScore: user.weeklyScore, // this week's score
        consecutiveActiveDays: user.consecutiveActiveDays,
        lastActiveDate: user.lastActiveDate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get another user's score history (for admin/agency access)
exports.getUserScoreHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Verify user exists
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
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

// Get current user's score history
exports.getMyScoreHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const history = await ScoreHistory.find({ femaleUserId: req.user._id })
      .populate('ruleId', 'ruleType scoreValue')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ScoreHistory.countDocuments({ femaleUserId: req.user._id });
    
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