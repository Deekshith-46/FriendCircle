const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const controller = require('../../controllers/adminControllers/newRewardController');

// Reward rules management
router.get('/rules', auth, dynamicPermissionCheck, controller.getAllRewardRules);
router.post('/rules', auth, dynamicPermissionCheck, controller.createRewardRule);
router.put('/rules/:id', auth, dynamicPermissionCheck, controller.updateRewardRule);
router.delete('/rules/:id', auth, dynamicPermissionCheck, controller.deleteRewardRule);

// User score management
router.get('/users/:userId/scores', auth, dynamicPermissionCheck, controller.getUserScores);
router.get('/users/:userId/history', auth, dynamicPermissionCheck, controller.getUserScoreHistory);
router.put('/users/:userId/adjust-score', auth, dynamicPermissionCheck, controller.adjustUserScore);

module.exports = router;