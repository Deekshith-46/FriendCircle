// /routes/femaleUserRoutes/kycRoutes.js
const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/femaleUserControllers/kycController');
const auth = require('../../middlewares/authMiddleware');
const { parser } = require('../../config/multer');

// Submit/Update KYC (accepts JSON or multipart/form-data without files)
router.post('/submit-kyc', auth, parser.none(), kycController.submitKYC);

// Get current payout account details
router.get('/payout-details', auth, kycController.getPayoutDetails);

// Admin verification of KYC (accepts JSON or multipart/form-data without files)
router.post('/verify-kyc', auth, parser.none(), kycController.verifyKYC);

module.exports = router;
