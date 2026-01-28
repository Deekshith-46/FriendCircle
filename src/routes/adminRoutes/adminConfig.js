const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminControllers/adminController');
const auth = require('../../middlewares/authMiddleware');

// Get nearby distance settings
router.get('/nearby-distance', auth, adminController.getNearbyDistance);

// Update nearby distance settings
router.post('/nearby-distance', auth, adminController.updateNearbyDistance);

// Get new user window days
router.get('/new-user-window', auth, adminController.getNewUserWindowDays);

// Update new user window days
router.post('/new-user-window', auth, adminController.updateNewUserWindowDays);

module.exports = router;