const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  userType: { type: String, enum: ['female', 'agency'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  coinsRequested: { type: Number, required: true, min: 1 },
  amountInRupees: { type: Number, required: true, min: 0 }, // derived as coins/100
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'failed'], default: 'pending' },
  // Payout destination
  payoutMethod: { type: String, enum: ['bank', 'upi'], required: true },
  payoutDetails: { type: Object, required: true },
  // Razorpay refs
  razorpayContactId: { type: String },
  razorpayFundAccountId: { type: String },
  razorpayPayoutId: { type: String },
  notes: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);


