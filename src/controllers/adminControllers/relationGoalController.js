const RelationGoal = require('../../models/admin/RelationGoal');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

exports.createRelationGoal = async (req, res) => {
  try {
    const { title, subTitle, status } = req.body;

    const userId = getUserId(req);
    const goal = await RelationGoal.create({ title, subTitle, status, createdBy: userId });

    await createAuditLog(userId, 'CREATE', 'RelationGoal', goal._id, { title, subTitle, status });

    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllRelationGoals = async (req, res) => {
  try {
    const goals = await RelationGoal.find();
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateRelationGoal = async (req, res) => {
  try {
    const { title, subTitle, status } = req.body;
    const userId = getUserId(req);
    const goal = await RelationGoal.findByIdAndUpdate(req.params.id, { title, subTitle, status }, { new: true });

    await createAuditLog(userId, 'UPDATE', 'RelationGoal', goal._id, { title, subTitle, status });

    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteRelationGoal = async (req, res) => {
  try {
    const goal = await RelationGoal.findByIdAndDelete(req.params.id);
    const userId = getUserId(req);
    await createAuditLog(userId, 'DELETE', 'RelationGoal', goal._id, { title: goal.title });
    res.json({ success: true, message: 'RelationGoal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
