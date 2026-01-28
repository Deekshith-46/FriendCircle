const Interest = require('../../models/admin/Interest');

// Get all interests with only title and id
exports.getInterests = async (req, res) => {
  try {
    const interests = await Interest.find({ status: 'publish' })
      .select('_id title')
      .sort({ title: 1 });

    return res.json({
      success: true,
      data: interests
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
