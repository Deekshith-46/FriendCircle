const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
	femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
	imageUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FemaleImage', imageSchema);


