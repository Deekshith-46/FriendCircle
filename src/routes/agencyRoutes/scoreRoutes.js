const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/agencyControllers/agencyScoreController');

// Agency score APIs
router.get('/female-users', auth, controller.getFemaleUsersWithScores);
router.get('/female-users/:userId', auth, controller.getFemaleUserScores);
router.get('/female-users/:userId/scores/history', auth, controller.getFemaleUserScoreHistory);

module.exports = router;