const express = require('express');
const router = express.Router();
const { deleteAccount } = require('../../controllers/agencyControllers/agencyUserController');
const auth = require('../../middlewares/authMiddleware');

// Apply authentication middleware
router.use(auth);

// DELETE /agency/account
// Permanently delete agency user account
router.delete('/account', deleteAccount);

module.exports = router;