const mongoose = require('mongoose');

const adminEarningSchema = new mongoose.Schema({
  // Source of earning
  source: { 
    type: String, 
    enum: ['PACKAGE_PURCHASE', 'WALLET_RECHARGE', 'GIFT_PURCHASE', 'CALL_COMMISSION'], 
    required: true 
  },
  
  // Who made the payment
  fromUserType: { 
    type: String, 
    enum: ['male', 'female', 'agency'], 
    required: true 
  },
  fromUserModel: { 
    type: String, 
    enum: ['MaleUser', 'FemaleUser', 'AgencyUser'], 
    required: true 
  },
  fromUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'fromUserModel' 
  },
  
  // Amount earned by admin
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  // Link to transaction record
  transactionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transaction',
    required: true
  },
  
  // Link to payment record (if applicable)
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment' 
  },
  
  // Package details (if package purchase)
  packageId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Package' 
  },
  
  // Additional metadata
  metadata: {
    packageName: String,
    packageAmount: Number,
    coinsReceived: Number,
    walletAmount: Number
  }
  
}, { 
  timestamps: true 
});

// Indexes for efficient querying
adminEarningSchema.index({ createdAt: -1 });
adminEarningSchema.index({ source: 1 });
adminEarningSchema.index({ fromUserId: 1 });
adminEarningSchema.index({ fromUserType: 1 });
adminEarningSchema.index({ fromUserModel: 1 });

module.exports = mongoose.model('AdminEarning', adminEarningSchema);