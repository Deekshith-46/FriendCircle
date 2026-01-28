// /routes/femaleUserRoutes/kycRoutes.js
const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/femaleUserControllers/kycController');
const auth = require('../../middlewares/authMiddleware');
const { parser } = require('../../config/multer');

// Submit KYC (accepts JSON or multipart/form-data without files)
router.post('/submit-kyc', auth, parser.none(), kycController.submitKYC);

// Admin verification of KYC (accepts JSON or multipart/form-data without files)
router.post('/verify-kyc', auth, parser.none(), kycController.verifyKYC);

module.exports = router;
