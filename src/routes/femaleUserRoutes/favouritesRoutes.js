const express = require('express');
const router = express.Router();
const favouritesController = require('../../controllers/femaleUserControllers/favouritesController');
const auth = require('../../middlewares/authMiddleware');

// Add to Favourites
router.post('/add-favourites', auth, favouritesController.addToFemaleFavourites);

// Remove from Favourites
router.delete('/remove-favourites', auth, favouritesController.removeFromFemaleFavourites);

// Get Favourites List
router.get('/list-favourites', auth, favouritesController.getFemaleFavouritesList);

module.exports = router;
