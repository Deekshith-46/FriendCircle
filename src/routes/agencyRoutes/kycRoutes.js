const express = require('express');
const router = express.Router();
const kycController = require('../../controllers/agencyControllers/kycController');
const auth = require('../../middlewares/authMiddleware');

// Submit/Update KYC
router.post('/submit-kyc', auth, kycController.submitKYC);

// Get current payout account details
router.get('/payout-details', auth, kycController.getPayoutDetails);

// Get KYC status
router.get('/status', auth, kycController.getKYCStatus);

// Bank Account Endpoints
router.post('/bank-account', auth, kycController.addBankAccount);         // Add new bank account
router.put('/bank-account', auth, kycController.updateBankAccount);        // Update existing bank account
router.get('/bank-account', auth, kycController.getBankAccount);                          // Get bank account details

// UPI Account Endpoints
router.post('/upi-account', auth, kycController.addUpiAccount);            // Add new UPI details
router.put('/upi-account', auth, kycController.updateUpiAccount);           // Update existing UPI details
router.get('/upi-account', auth, kycController.getUpiAccount);                            // Get UPI details

module.exports = router;
