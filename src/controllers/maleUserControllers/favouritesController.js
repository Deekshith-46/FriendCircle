const MaleFavourites = require('../../models/maleUser/Favourites');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');

// Add a Female User to MaleFavourites
exports.addToMaleFavourites = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    const maleUser = await MaleUser.findById(req.user.id);
    
    // Check if the male user has already added this female user to MaleFavourites
    const existingFavourite = await MaleFavourites.findOne({
      maleUserId: maleUser._id,
      femaleUserId,
    });
    
    if (existingFavourite) {
      return res.status(400).json({ success: false, message: 'Already added to MaleFavourites.' });
    }

    // Add to male user's MaleFavourites list
    const newFavourite = new MaleFavourites({
      maleUserId: maleUser._id,
      femaleUserId,
    });
    await newFavourite.save();

    res.json({ success: true, message: 'Female user added to MaleFavourites.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove a Female User from MaleFavourites
exports.removeFromMaleFavourites = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    const maleUser = await MaleUser.findById(req.user.id);

    // Remove from male user's MaleFavourites list
    await MaleFavourites.findOneAndDelete({ maleUserId: maleUser._id, femaleUserId });

    res.json({ success: true, message: 'Female user removed from MaleFavourites.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Male User's MaleFavourites List
exports.getMaleFavouritesList = async (req, res) => {
  try {
    const maleUser = await MaleUser.findById(req.user.id);

    const MaleFavouritesList = await MaleFavourites.find({ maleUserId: maleUser._id }).populate('femaleUserId', 'name email');
    res.json({ success: true, data: MaleFavouritesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
