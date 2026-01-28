const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  maleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  imageUrl: { type: String, required: true }, // URL of the uploaded image
}, { timestamps: true });

module.exports = mongoose.model('MaleImage', imageSchema);
