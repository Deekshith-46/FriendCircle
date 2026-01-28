const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/packageController');

// Create Package (accepts form-data)
router.post('/', auth, dynamicPermissionCheck, parser.none(), controller.createPackage);

// Get All Packages
router.get('/', auth, dynamicPermissionCheck, controller.getAllPackages);

// Update Package (accepts form-data)
router.put('/:id', auth, dynamicPermissionCheck, parser.none(), controller.updatePackage);

// Delete Package
router.delete('/:id', auth, dynamicPermissionCheck, controller.deletePackage);

module.exports = router;
