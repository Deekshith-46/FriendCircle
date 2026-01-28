const express = require('express');
const router = express.Router();
const rewardController = require('../../controllers/adminControllers/rewardController');
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');

// Daily Reward Routes
router.post('/daily-rewards', auth, dynamicPermissionCheck, rewardController.createDailyReward);
router.get('/daily-rewards', auth, dynamicPermissionCheck, rewardController.getDailyRewards);
router.put('/daily-rewards/:id', auth, dynamicPermissionCheck, rewardController.updateDailyReward);
router.delete('/daily-rewards/:id', auth, dynamicPermissionCheck, rewardController.deleteDailyReward);

// Weekly Reward Routes
router.post('/weekly-rewards', auth, dynamicPermissionCheck, rewardController.createWeeklyReward);
router.get('/weekly-rewards', auth, dynamicPermissionCheck, rewardController.getWeeklyRewards);
router.put('/weekly-rewards/:id', auth, dynamicPermissionCheck, rewardController.updateWeeklyReward);
router.delete('/weekly-rewards/:id', auth, dynamicPermissionCheck, rewardController.deleteWeeklyReward);

// Pending Reward Routes
router.get('/pending-rewards', auth, dynamicPermissionCheck, rewardController.getPendingRewards);
router.post('/pending-rewards/:id/approve', auth, dynamicPermissionCheck, rewardController.approvePendingReward);
router.post('/pending-rewards/:id/reject', auth, dynamicPermissionCheck, rewardController.rejectPendingReward);

// Reward History Routes
router.get('/reward-history', auth, dynamicPermissionCheck, rewardController.getRewardHistory);

// Manual Trigger Routes
router.post('/trigger-daily', auth, dynamicPermissionCheck, rewardController.triggerDailyRewards);
router.post('/trigger-weekly', auth, dynamicPermissionCheck, rewardController.triggerWeeklyRewards);

module.exports = router;