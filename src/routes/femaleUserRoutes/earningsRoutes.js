// /routes/femaleUserRoutes/earningsRoutes.js
const express = require('express');
const router = express.Router();
const earningsController = require('../../controllers/femaleUserControllers/earningsController');
const auth = require('../../middlewares/authMiddleware');

// Get all rewards (earnings)
router.get('/rewards', auth, earningsController.getRewards);
module.exports = router;

// // Add reward to user
// router.post('/add-reward', auth, earningsController.addReward);

