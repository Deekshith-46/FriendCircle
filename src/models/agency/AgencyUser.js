const mongoose = require('mongoose');

const agencyUserSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true },
	mobileNumber: { type: String, required: true, unique: true },
	otp: {
		type: Number,
		required: function() {
			return !this.isVerified;
		}
	},
	isVerified: { type: Boolean, default: false },
	isActive: { type: Boolean, default: false }, // Only true after OTP verification
	firstName: { type: String },
	lastName: { type: String },
	aadharOrPanNum: { type: String },
	image: { type: String },
	referralCode: { type: String, unique: true, sparse: true },
	// Referral system
	referredByAgency: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgencyUser' }],
	referredFemaleUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }], 
	status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
	profileCompleted: { type: Boolean, default: false },
	reviewStatus: { type: String, enum: ['completeProfile', 'pending', 'accepted', 'rejected'], default: 'completeProfile' },
	kycStatus: { type: String, enum: ['completeKyc', 'pending', 'accepted', 'rejected'], default: 'completeKyc' },
	kycDetails: { 
	  bank: {
	    _id: { type: mongoose.Schema.Types.ObjectId },
	    name: String,
	    accountNumber: String,
	    ifsc: String,
	    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
	    verifiedAt: Date
	  },
	  upi: {
	    _id: { type: mongoose.Schema.Types.ObjectId },
	    upiId: String,
	    status: { type: String, enum: ['pending', 'rejected', 'accepted'], default: 'pending' },
	    verifiedAt: Date
	  }
	},
	walletBalance: { type: Number, default: 0 },
	
	// Push Notification FCM Tokens (support multiple devices)
	fcmTokens: [{
	  token: { type: String, required: true },
	  deviceId: { type: String }, // Optional device identifier
	  platform: { type: String, enum: ['ios', 'android', 'web'] },
	  createdAt: { type: Date, default: Date.now }
	}]
}, { timestamps: true });

module.exports = mongoose.model('AgencyUser', agencyUserSchema);