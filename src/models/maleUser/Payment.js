const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser', required: true },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  amount: { type: Number, required: true }, // Amount in paise
  currency: { type: String, default: 'INR' },
  type: { type: String, enum: ['wallet', 'coin'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  coinsReceived: { type: Number }, // For coin recharges
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' }, // For coin recharges
  walletAmount: { type: Number }, // For wallet recharges
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' } // Link to transaction record
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
