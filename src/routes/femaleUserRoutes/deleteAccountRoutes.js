const express = require('express');
const router = express.Router();
const { deleteAccount } = require('../../controllers/femaleUserControllers/femaleUserController');
const auth = require('../../middlewares/authMiddleware');

console.log('Auth middleware type:', typeof auth);
console.log('Auth middleware:', auth);

// Apply authentication middleware
router.use(auth);

// DELETE /female-user/account
// Permanently delete female user account
router.delete('/account', deleteAccount);

module.exports = router;