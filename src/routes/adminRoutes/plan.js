const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/planController');

// Create Plan (accepts form-data)
router.post('/', auth, dynamicPermissionCheck, parser.none(), controller.createPlan);

// Get All Plans
router.get('/', auth, dynamicPermissionCheck, controller.getAllPlans);

// Update Plan (accepts form-data)
router.put('/:id', auth, dynamicPermissionCheck, parser.none(), controller.updatePlan);

// Delete Plan
router.delete('/:id', auth, dynamicPermissionCheck, controller.deletePlan);

module.exports = router;
