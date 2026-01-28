const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const controller = require('../../controllers/adminControllers/topFanConfigController');

// Create Top Fan Config
router.post('/', auth, dynamicPermissionCheck, controller.createConfig);

// Get All Configs
router.get('/', auth, dynamicPermissionCheck, controller.getAllConfigs);

// Get Config by ID
router.get('/:id', auth, dynamicPermissionCheck, controller.getConfigById);

// Get Active Config
router.get('/active', auth, dynamicPermissionCheck, controller.getActiveConfig);

// Update Config
router.put('/:id', auth, dynamicPermissionCheck, controller.updateConfig);

// Delete Config
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteConfig);

// Activate Config
router.post('/:id/activate', auth, dynamicPermissionCheck, controller.activateConfig);

module.exports = router;