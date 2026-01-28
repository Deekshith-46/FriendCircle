const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const maleUserController = require('../../controllers/maleUserControllers/maleUserController');

// Get male dashboard with All, Nearby, Followed, New sections
router.post('/dashboard', auth, maleUserController.getDashboard);

module.exports = router;