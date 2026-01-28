const Plan = require('../../models/admin/Plan');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

// Create Plan
exports.createPlan = async (req, res) => {
  try {
    const { title, amount, dayLimit, description, toggleButtons, status } = req.body;
    const userId = getUserId(req);
    const plan = await Plan.create({
      title,
      amount,
      dayLimit,
      description,
      toggleButtons,
      status,
      createdBy: userId
    });
    await createAuditLog(userId, 'CREATE', 'Plan', plan._id, { title, amount, dayLimit, description, toggleButtons, status });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get All Plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Plan
exports.updatePlan = async (req, res) => {
  try {
    const { title, amount, dayLimit, description, toggleButtons, status } = req.body;
    const userId = getUserId(req);
    const plan = await Plan.findByIdAndUpdate(req.params.id, { title, amount, dayLimit, description, toggleButtons, status }, { new: true });
    await createAuditLog(userId, 'UPDATE', 'Plan', plan._id, { title, amount, dayLimit, description, toggleButtons, status });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Plan
exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    const userId = getUserId(req);
    await createAuditLog(userId, 'DELETE', 'Plan', plan._id, { title: plan.title });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
