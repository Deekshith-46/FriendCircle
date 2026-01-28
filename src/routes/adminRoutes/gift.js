const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer'); 
const controller = require('../../controllers/adminControllers/giftController');

// Create Gift
router.post('/', auth, dynamicPermissionCheck, parser.single('image'), controller.createGift);

// Get All Gifts
router.get('/', auth, dynamicPermissionCheck, controller.getAllGifts);

// Update Gift
router.put('/:id', auth, dynamicPermissionCheck, parser.single('image'), controller.updateGift);

// Delete Gift
router.delete('/:id', auth, dynamicPermissionCheck, controller.deleteGift);

module.exports = router;
