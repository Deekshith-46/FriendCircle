const Page = require('../../models/admin/Page');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

// Create Page
exports.createPage = async (req, res) => {
    try {
        const { title, slug, description, status } = req.body;
        const userId = getUserId(req);
        const page = await Page.create({
            title,
            slug,
            description,
            status,
            createdBy: userId
        });
        if (!req.body.slug) {
            return res.status(400).json({ success: false, error: 'Slug is required' });
        }
        await createAuditLog(userId, 'CREATE', 'Page', page._id, { title, description, status });
        res.status(201).json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get All Pages
exports.getAllPages = async (req, res) => {
    try {
        const pages = await Page.find();
        res.json({ success: true, data: pages });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Update Page
exports.updatePage = async (req, res) => {
    try {
        const { title, description, status } = req.body;
        const userId = getUserId(req);
        const page = await Page.findByIdAndUpdate(req.params.id, { title, description, status }, { new: true });
        await createAuditLog(userId, 'UPDATE', 'Page', page._id, { title, description, status });
        res.json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete Page
exports.deletePage = async (req, res) => {
    try {
        const page = await Page.findByIdAndDelete(req.params.id);
        const userId = getUserId(req);
        await createAuditLog(userId, 'DELETE', 'Page', page._id, { title: page.title });
        res.json({ success: true, message: 'Page deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
