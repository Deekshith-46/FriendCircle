const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/religionController');

// Create Religion (accepts form-data)
router.post('/', auth, dynamicPermissionCheck, parser.none(), controller.createReligion);

// Get All Religions
router.get('/', auth, dynamicPermissionCheck, controller.getAllReligions);

// Update Religion (accepts form-data)
router.put('/:id', auth, dynamicPermissionCheck, parser.none(), controller.updateReligion);

// Delete Religion
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteReligion);

module.exports = router;
