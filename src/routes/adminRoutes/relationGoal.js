const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/relationGoalController');

// Create Relation Goal (accepts form-data)
router.post('/', auth, dynamicPermissionCheck, parser.none(), controller.createRelationGoal);

// Get All Relation Goals
router.get('/', auth, dynamicPermissionCheck, controller.getAllRelationGoals);

// Update Relation Goal (accepts form-data)
router.put('/:id', auth, dynamicPermissionCheck, parser.none(), controller.updateRelationGoal);

// Delete Relation Goal
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteRelationGoal);

module.exports = router;
