const FAQ = require('../../models/admin/FAQ');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

// Create FAQ
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, status } = req.body;
    const userId = getUserId(req);
    const faq = await FAQ.create({ question, answer, status, createdBy: userId });
    await createAuditLog(userId, 'CREATE', 'FAQ', faq._id, { question, answer, status });
    res.status(201).json({ success: true, data: faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get All FAQs
exports.getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.json({ success: true, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update FAQ
exports.updateFAQ = async (req, res) => {
  try {
    const { question, answer, status } = req.body;
    const userId = getUserId(req);
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { question, answer, status }, { new: true });
    await createAuditLog(userId, 'UPDATE', 'FAQ', faq._id, { question, answer, status });
    res.json({ success: true, data: faq });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete FAQ
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    const userId = getUserId(req);
    await createAuditLog(userId, 'DELETE', 'FAQ', faq._id, { question: faq.question });
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
