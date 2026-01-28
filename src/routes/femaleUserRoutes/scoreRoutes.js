const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/femaleUserControllers/femaleUserScoreController');

// Female user score APIs
router.get('/me/scores', auth, controller.getMyScores);
router.get('/me/scores/history', auth, controller.getMyScoreHistory);

// Alternative endpoint using token-based authentication
router.get('/score-history', auth, controller.getMyScoreHistory);

// Admin/Agency access to other users' score history
router.get('/:userId/score-history', auth, controller.getUserScoreHistory);

module.exports = router;