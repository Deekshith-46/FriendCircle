const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/userManagementController');
const femaleUserController = require('../../controllers/femaleUserControllers/femaleUserController');

// List users (all/male/female) => query ?type=male|female
router.get('/', auth, dynamicPermissionCheck, controller.listUsers);

// Toggle status (accepts form-data or JSON)
router.post('/toggle-status', auth, dynamicPermissionCheck, parser.none(), controller.toggleStatus);

// Wallet/Coin operations for a user (accepts JSON or form-data)
router.post('/operate-balance', auth, dynamicPermissionCheck, parser.none(), controller.operateBalance);

// Level configuration routes
router.post('/level-config', auth, dynamicPermissionCheck, parser.none(), controller.createUpdateLevelConfig);
router.get('/level-config', auth, dynamicPermissionCheck, controller.getAllLevelConfigs);
router.put('/level-config/:id', auth, dynamicPermissionCheck, parser.none(), controller.updateLevelConfig);
router.delete('/level-config/:id', auth, dynamicPermissionCheck, controller.deleteLevelConfig);
router.post('/set-call-rates', auth, dynamicPermissionCheck, parser.none(), controller.setFemaleCallRates);

// List transactions for a user with optional filters
router.get('/:userType/:userId/transactions', auth, dynamicPermissionCheck, controller.listTransactions);

// Approve/Reject registration review (female or agency)
router.post('/review-registration', auth, dynamicPermissionCheck, parser.none(), controller.reviewRegistration);

// Approve/Reject KYC
router.post('/review-kyc', auth, dynamicPermissionCheck, parser.none(), controller.reviewKYC);

// List pending registrations for admin review
router.get('/pending-registrations', auth, dynamicPermissionCheck, controller.listPendingRegistrations);

// List pending KYCs for admin review
router.get('/pending-kycs', auth, dynamicPermissionCheck, controller.listPendingKYCs);

// Delete user by admin (for testing purposes)
router.delete('/:userType/:userId', auth, dynamicPermissionCheck, controller.deleteUser);

// Cleanup incomplete female profiles (older than 7 days)
router.post('/cleanup-incomplete-profiles', auth, dynamicPermissionCheck, femaleUserController.cleanupIncompleteProfiles);

// Set call rate (coins per second) for female user
router.post('/set-call-rate', auth, dynamicPermissionCheck, parser.none(), controller.setFemaleCallRate);

// Clean up user references (remove invalid interests/languages references)
router.post('/:userType/:userId/cleanup-references', auth, dynamicPermissionCheck, controller.cleanUserReferences);

// Test endpoint to verify route is working
router.get('/test-call-rate-route', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Call rate route is registered correctly!',
    endpoint: 'POST /admin/users/set-call-rate'
  });
});

module.exports = router;


