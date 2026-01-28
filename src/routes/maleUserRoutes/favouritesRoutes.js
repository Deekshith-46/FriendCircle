const express = require('express');
const router = express.Router();
const favouritesController = require('../../controllers/maleUserControllers/favouritesController');
const auth = require('../../middlewares/authMiddleware');

// Add to Favourites
router.post('/add-favourites', auth, favouritesController.addToMaleFavourites);

// Remove from Favourites
router.delete('/remove-favourites', auth, favouritesController.removeFromMaleFavourites);

// Get Favourites List
router.get('/list-favourites', auth, favouritesController.getMaleFavouritesList);

module.exports = router;
