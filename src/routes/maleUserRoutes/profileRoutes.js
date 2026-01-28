const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const profileController = require('../../controllers/maleUserControllers/profileController');

// Add or replace details
router.post('/details', auth, profileController.addDetails);

// Update details (partial)
router.patch('/details', auth, profileController.updateDetails);

// Delete selected details (pass { fields: [..] })
router.delete('/details', auth, profileController.deleteDetails);

module.exports = router;


