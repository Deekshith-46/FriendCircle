const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/pageController');

// Create Page (accepts form-data)
router.post('/', auth, dynamicPermissionCheck, parser.none(), controller.createPage);

// Get All Pages
router.get('/', auth, dynamicPermissionCheck, controller.getAllPages);

// Update Page (accepts form-data)
router.put('/:id', auth, dynamicPermissionCheck, parser.none(), controller.updatePage);

// Delete Page
router.delete('/:id', auth, dynamicPermissionCheck, controller.deletePage);

module.exports = router;
