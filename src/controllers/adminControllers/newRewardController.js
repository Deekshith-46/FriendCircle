const AdminRewardRule = require('../../models/admin/AdminRewardRule');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const ScoreHistory = require('../../models/common/ScoreHistory');

// Get all reward rules
exports.getAllRewardRules = async (req, res) => {
  try {
    const rules = await AdminRewardRule.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a new reward rule
exports.createRewardRule = async (req, res) => {
  try {
    const { ruleType, scoreValue, minCount, requiredDays, description, isActive } = req.body;
    
    // Validate ruleType
    const validRuleTypes = ["DAILY_LOGIN", "DAILY_AUDIO_CALL_TARGET", "DAILY_VIDEO_CALL_TARGET", "WEEKLY_CONSISTENCY"];
    if (!validRuleTypes.includes(ruleType)) {
      return res.status(400).json({ success: false, message: 'Invalid ruleType. Must be one of: DAILY_LOGIN, DAILY_AUDIO_CALL_TARGET, DAILY_VIDEO_CALL_TARGET, WEEKLY_CONSISTENCY' });
    }
    
    const rule = new AdminRewardRule({
      ruleType,
      scoreValue,
      minCount,
      requiredDays,
      description,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await rule.save();
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update a reward rule
exports.updateRewardRule = async (req, res) => {
  try {
    const { ruleType, scoreValue, minCount, requiredDays, description, isActive } = req.body;
    
    // Validate ruleType if provided
    if (ruleType) {
      const validRuleTypes = ["DAILY_LOGIN", "DAILY_AUDIO_CALL_TARGET", "DAILY_VIDEO_CALL_TARGET", "WEEKLY_CONSISTENCY"];
      if (!validRuleTypes.includes(ruleType)) {
        return res.status(400).json({ success: false, message: 'Invalid ruleType. Must be one of: DAILY_LOGIN, DAILY_AUDIO_CALL_TARGET, DAILY_VIDEO_CALL_TARGET, WEEKLY_CONSISTENCY' });
      }
    }
    
    const updateData = {};
    if (ruleType !== undefined) updateData.ruleType = ruleType;
    if (scoreValue !== undefined) updateData.scoreValue = scoreValue;
    if (minCount !== undefined) updateData.minCount = minCount;
    if (requiredDays !== undefined) updateData.requiredDays = requiredDays;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const rule = await AdminRewardRule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a reward rule
exports.deleteRewardRule = async (req, res) => {
  try {
    const rule = await AdminRewardRule.findByIdAndDelete(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get user's score history
exports.getUserScoreHistory = async (req, res) => {
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

// Get user's current scores
exports.getUserScores = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await FemaleUser.findById(userId).select('score dailyScore weeklyScore');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Manually adjust user's total score (for admin corrections)
exports.adjustUserScore = async (req, res) => {
  try {
    const { userId, scoreAdjustment, reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reason for adjustment is required' 
      });
    }
    
    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update the total score
    const updatedUser = await FemaleUser.findByIdAndUpdate(
      userId,
      { $inc: { score: scoreAdjustment } },
      { new: true, select: 'score dailyScore weeklyScore' }
    );
    
    // Log the manual adjustment
    await ScoreHistory.create({
      femaleUserId: userId,
      ruleType: 'MANUAL_ADJUSTMENT',
      scoreAdded: scoreAdjustment,
      referenceDate: new Date(),
      addedBy: req.user._id.toString(),
      note: reason
    });
    
    res.json({ 
      success: true, 
      data: updatedUser,
      message: `Score adjusted by ${scoreAdjustment}. New total: ${updatedUser.score}` 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};