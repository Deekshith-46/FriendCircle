const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

// Maintenance routes
// NOTE: These should be protected by admin authentication in production
router.post('/cleanup-dangling-references', maintenanceController.cleanupDanglingReferences);

module.exports = router;