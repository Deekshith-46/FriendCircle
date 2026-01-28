const mongoose = require('mongoose');

const followRequestSchema = new mongoose.Schema({
  maleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FollowRequest', followRequestSchema);