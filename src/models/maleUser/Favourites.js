const mongoose = require('mongoose');

const favouritesSchema = new mongoose.Schema({
  maleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  dateAdded: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MaleFavourites', favouritesSchema);
