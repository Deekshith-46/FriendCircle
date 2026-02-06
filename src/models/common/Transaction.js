const mongoose = require('mongoose');

// Generic transaction model for wallet and coin operations across Male/Female users
const transactionSchema = new mongoose.Schema({
  userType: { type: String, enum: ['male', 'female', 'agency'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  operationType: { type: String, enum: ['wallet', 'coin'], required: true },
  action: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  message: { type: String },
  balanceAfter: { type: Number, required: true },
  earningType: { type: String, enum: ['call', 'gift', 'other'] }, // Type of earning for female users
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  
  // Payment gateway integration
  paymentGateway: { 
    type: String, 
    enum: ['razorpay', 'stripe', 'paypal'], 
    default: 'razorpay' 
  },
  paymentId: { type: String }, // Razorpay payment ID
  orderId: { type: String },    // Razorpay order ID
  status: { 
    type: String, 
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], 
    default: 'PENDING' 
  },
  
  // Admin earning reference
  adminEarningId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdminEarning' 
  },
  
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);