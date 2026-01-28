const mongoose = require('mongoose');

const followersSchema = new mongoose.Schema({
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  maleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  dateFollowed: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FemaleFollowers', followersSchema);
