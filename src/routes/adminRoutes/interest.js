const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer'); // for image upload
const controller = require('../../controllers/adminControllers/interestController');

// Create Interest
router.post('/', auth, dynamicPermissionCheck, parser.single('image'), controller.createInterest);

// Get All Interests
router.get('/', auth, dynamicPermissionCheck, controller.getAllInterests);

// Update Interest
router.put('/:id', auth, dynamicPermissionCheck, parser.single('image'), controller.updateInterest);

// Delete Interest
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteInterest);

module.exports = router;
