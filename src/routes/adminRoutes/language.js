const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer'); 
const controller = require('../../controllers/adminControllers/languageController');

// Create Language
router.post('/', auth, dynamicPermissionCheck, parser.single('image'), controller.createLanguage);

// Get All Languages
router.get('/', auth, dynamicPermissionCheck, controller.getAllLanguages);

// Update Language
router.put('/:id', auth, dynamicPermissionCheck, parser.single('image'), controller.updateLanguage);

// Delete Language
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteLanguage);

module.exports = router;
