const mongoose = require('mongoose');

const followingSchema = new mongoose.Schema({
  maleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  dateFollowed: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MaleFollowing', followingSchema);
