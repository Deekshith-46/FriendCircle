const express = require('express');
const router = express.Router();
const { deleteAccount } = require('../../controllers/maleUserControllers/maleUserController');
const auth = require('../../middlewares/authMiddleware');

// Apply authentication middleware
router.use(auth);

// DELETE /male-user/account
// Permanently delete male user account
router.delete('/account', deleteAccount);

module.exports = router;