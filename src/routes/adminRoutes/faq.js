const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');
const controller = require('../../controllers/adminControllers/faqController');

// Create FAQ (accepts form-data)
router.post('/', auth, dynamicPermissionCheck, parser.none(), controller.createFAQ);

// Get All FAQs
router.get('/', auth, dynamicPermissionCheck, controller.getAllFAQs);

// Update FAQ (accepts form-data)
router.put('/:id', auth, dynamicPermissionCheck, parser.none(), controller.updateFAQ);

// Delete FAQ
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteFAQ);

module.exports = router;
