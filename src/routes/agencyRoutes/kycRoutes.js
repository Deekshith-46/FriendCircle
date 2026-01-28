const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/agencyControllers/kycController');
const auth = require('../../middlewares/authMiddleware');

// Submit KYC
router.post('/submit-kyc', auth, kycController.submitKYC);

// Get KYC status
router.get('/status', auth, kycController.getKYCStatus);

module.exports = router;
