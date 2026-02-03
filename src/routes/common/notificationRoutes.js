// src/routes/common/notificationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const notificationController = require('../../controllers/common/notificationController');

// Save FCM token for push notifications
router.post('/save-token', auth, notificationController.saveFCMToken);

// Remove FCM token (device logout/uninstall)
router.delete('/token', auth, notificationController.removeFCMToken);

// Get registered devices
router.get('/devices', auth, notificationController.getRegisteredDevices);

// Test notification (development/testing only)
router.post('/test', auth, async (req, res) => {
  const { targetUserId, targetType, title, body, data } = req.body;
  const senderUserId = req.user.id;
  const senderUserType = req.userType;

  // Validate inputs
  if (!targetUserId || !targetType || !title || !body) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: targetUserId, targetType, title, body'
    });
  }

  // Validate user types
  if (!['male', 'female', 'agency'].includes(targetType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid target user type'
    });
  }

  const payload = {
    title,
    body,
    data: {
      ...data,
      senderId: senderUserId.toString(),
      senderType: senderUserType,
      type: 'test_notification'
    }
  };

  // Import and use sendNotificationWithIntent
  const { sendNotificationWithIntent } = require('../../services/notificationService');
  const results = await sendNotificationWithIntent(targetUserId, targetType, title, body, payload);

  const successful = results.push ? results.push.filter(r => r.success).length : 0;
  
  if (results.db !== false) {
    return res.json({
      success: true,
      message: `Test notification sent successfully`,
      data: { results }
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

module.exports = router;