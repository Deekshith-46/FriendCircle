const mongoose = require('mongoose');

// granular permission triple per module: read/write/update
const permissionTripleSchema = new mongoose.Schema({
	read: { type: Boolean, default: false },
	write: { type: Boolean, default: false },
	update: { type: Boolean, default: false }
}, { _id: false });

// Allowed modules (exclude: payment gateway, payout, user list, fake user, report, notification, wallet, coin)
const staffPermissionsSchema = new mongoose.Schema({
	interest: { type: permissionTripleSchema, default: () => ({}) },
	language: { type: permissionTripleSchema, default: () => ({}) },
	religion: { type: permissionTripleSchema, default: () => ({}) },
	relationGoals: { type: permissionTripleSchema, default: () => ({}) },
	plan: { type: permissionTripleSchema, default: () => ({}) },
	package: { type: permissionTripleSchema, default: () => ({}) },
	page: { type: permissionTripleSchema, default: () => ({}) },
	faq: { type: permissionTripleSchema, default: () => ({}) },
	gift: { type: permissionTripleSchema, default: () => ({}) },
	users: { type: permissionTripleSchema, default: () => ({}) }
}, { _id: false });

const staffSchema = new mongoose.Schema({
	adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
	email: { type: String, required: true, unique: true },
	passwordHash: { type: String, required: true },
	status: { type: String, enum: ['publish', 'unpublish'], default: 'publish' },
	permissions: { type: staffPermissionsSchema, default: () => ({}) }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);


