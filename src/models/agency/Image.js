const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
	agencyUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgencyUser', required: true },
	imageUrl: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AgencyImage', imageSchema);


