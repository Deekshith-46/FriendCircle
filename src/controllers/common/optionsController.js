const Interest = require('../../models/admin/Interest');
const Language = require('../../models/admin/Language');
const Religion = require('../../models/admin/Religion');
const RelationGoal = require('../../models/admin/RelationGoal');
const Gift = require('../../models/admin/Gift');
const FAQ = require('../../models/admin/FAQ');
const Plan = require('../../models/admin/Plan');
const Package = require('../../models/admin/Package');
const Page = require('../../models/admin/Page');

// Public endpoint to fetch all selectable options for users
exports.getSelectableOptions = async (req, res) => {
  try {
    const statusFilter = { status: 'publish' };

    const [
      interests,
      languages,
      religions,
      relationGoals,
      gifts,
      faqs,
      plans,
      packages,
      pages
    ] = await Promise.all([
      Interest.find(statusFilter).select('title imageUrl status'),
      Language.find(statusFilter).select('title imageUrl status'),
      Religion.find(statusFilter).select('title status'),
      RelationGoal.find(statusFilter).select('title subTitle status'),
      Gift.find(statusFilter).select('giftTitle coin imageUrl status'),
      FAQ.find(statusFilter).select('question answer status'),
      Plan.find(statusFilter).select('title amount dayLimit description toggleButtons status'),
      Package.find(statusFilter).select('coin amount status'),
      Page.find(statusFilter).select('title slug description status')
    ]);

    return res.json({
      success: true,
      data: {
        interests,
        languages,
        religions,
        relationGoals,
        gifts,
        faqs,
        plans,
        packages,
        pages
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Public endpoint to fetch female user options (interests and languages only)
exports.getFemaleUserOptions = async (req, res) => {
  try {
    const statusFilter = { status: 'publish' };

    const [interests, languages] = await Promise.all([
      Interest.find(statusFilter).select('_id title'),
      Language.find(statusFilter).select('_id title')
    ]);

    return res.json({
      success: true,
      data: {
        interests,
        languages
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


