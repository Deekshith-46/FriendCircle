const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  coins: { type: Number, required: true },
  price: { type: Number, required: true }, // Price in currency (Rupees)
});

module.exports = mongoose.model('MalePackage', packageSchema);
