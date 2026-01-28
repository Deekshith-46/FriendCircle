const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const giftController = require('../../controllers/maleUserControllers/giftController');

// List available gifts
router.get('/', auth, giftController.listGifts);

// Send a gift to a female user
router.post('/send', auth, giftController.sendGift);

module.exports = router;


