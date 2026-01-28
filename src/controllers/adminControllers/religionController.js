const Religion = require('../../models/admin/Religion');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

exports.createReligion = async (req, res) => {
  try {
    const { title, status } = req.body;

    const userId = getUserId(req);
    const religion = await Religion.create({ title, status, createdBy: userId });

    await createAuditLog(userId, 'CREATE', 'Religion', religion._id, { title, status });

    res.status(201).json({ success: true, data: religion });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllReligions = async (req, res) => {
  try {
    const religions = await Religion.find();
    res.json({ success: true, data: religions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateReligion = async (req, res) => {
  try {
    const { title, status } = req.body;
    const userId = getUserId(req);
    const religion = await Religion.findByIdAndUpdate(req.params.id, { title, status }, { new: true });

    await createAuditLog(userId, 'UPDATE', 'Religion', religion._id, { title, status });

    res.json({ success: true, data: religion });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteReligion = async (req, res) => {
  try {
    const religion = await Religion.findByIdAndDelete(req.params.id);
    const userId = getUserId(req);
    await createAuditLog(userId, 'DELETE', 'Religion', religion._id, { title: religion.title });
    res.json({ success: true, message: 'Religion deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
