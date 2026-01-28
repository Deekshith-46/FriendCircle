const Package = require('../../models/admin/Package');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

// Create Package
exports.createPackage = async (req, res) => {
  try {
    const { coin, amount, status } = req.body;
    const userId = getUserId(req);
    const pkg = await Package.create({ coin, amount, status, createdBy: userId });
    await createAuditLog(userId, 'CREATE', 'Package', pkg._id, { coin, amount, status });
    res.status(201).json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get All Packages
exports.getAllPackages = async (req, res) => {
  try {
    const pkgs = await Package.find();
    res.json({ success: true, data: pkgs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Package
exports.updatePackage = async (req, res) => {
  try {
    const { coin, amount, status } = req.body;
    const userId = getUserId(req);
    const pkg = await Package.findByIdAndUpdate(req.params.id, { coin, amount, status }, { new: true });
    await createAuditLog(userId, 'UPDATE', 'Package', pkg._id, { coin, amount, status });
    res.json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Package
exports.deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    const userId = getUserId(req);
    await createAuditLog(userId, 'DELETE', 'Package', pkg._id, { coin: pkg.coin, amount: pkg.amount });
    res.json({ success: true, message: 'Package deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
