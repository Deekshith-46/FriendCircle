const FemaleFavourites = require('../../models/femaleUser/Favourites');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const MaleUser = require('../../models/maleUser/MaleUser');

// Add Male User to FemaleFavourites
exports.addToFemaleFavourites = async (req, res) => {
  const { maleUserId } = req.body;

  try {
    const femaleUser = await FemaleUser.findById(req.user.id);
    
    // Check if the female user has already added this male user to FemaleFavourites
    const existingFavourite = await FemaleFavourites.findOne({
      femaleUserId: femaleUser._id,
      maleUserId,
    });

    if (existingFavourite) {
      return res.status(400).json({ success: false, message: 'Already added to FemaleFavourites.' });
    }

    // Add to female user's FemaleFavourites list
    const newFavourite = new FemaleFavourites({
      femaleUserId: femaleUser._id,
      maleUserId,
    });
    await newFavourite.save();

    res.json({ success: true, message: 'Male user added to FemaleFavourites.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove Male User from FemaleFavourites
exports.removeFromFemaleFavourites = async (req, res) => {
  const { maleUserId } = req.body;

  try {
    const femaleUser = await FemaleUser.findById(req.user.id);

    // Remove from female user's FemaleFavourites list
    await FemaleFavourites.findOneAndDelete({ femaleUserId: femaleUser._id, maleUserId });

    res.json({ success: true, message: 'Male user removed from FemaleFavourites.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Female User's FemaleFavourites List
exports.getFemaleFavouritesList = async (req, res) => {
  try {
    const femaleUser = await FemaleUser.findById(req.user.id);

    const FemaleFavouritesList = await FemaleFavourites.find({ femaleUserId: femaleUser._id }).populate('maleUserId', 'firstName lastName email');
    res.json({ success: true, data: FemaleFavouritesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
