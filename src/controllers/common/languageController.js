const Language = require('../../models/admin/Language');

// Get all languages with only title and id
exports.getLanguages = async (req, res) => {
  try {
    const languages = await Language.find({ status: 'publish' })
      .select('_id title')
      .sort({ title: 1 });

    return res.json({
      success: true,
      data: languages
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
