// /controllers/femaleUserControllers/earningsController.js
const Reward = require('../../models/femaleUser/Reward');

// Get All Rewards for the User (daily, weekly)
exports.getRewards = async (req, res) => {
  try {
    const rewards = await Reward.find({ user: req.user.id });
    res.json({ success: true, data: rewards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// // Add Reward to User
// exports.addReward = async (req, res) => {
//   const { earnings } = req.body;
//   try {
//     const reward = new Reward({ user: req.user.id, earnings });
//     await reward.save();
//     res.json({ success: true, data: reward });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
