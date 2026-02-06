require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');

async function checkPaymentGatewayField() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Check transactions with paymentGateway field explicitly set
    const count1 = await Transaction.countDocuments({
      paymentGateway: { $exists: true, $ne: null }
    });
    console.log('Transactions with paymentGateway field explicitly set:', count1);
    
    // Check transactions with paymentGateway = razorpay
    const count2 = await Transaction.countDocuments({
      paymentGateway: 'razorpay'
    });
    console.log('Transactions with paymentGateway = razorpay:', count2);
    
    // Check male coin transactions with paymentGateway = razorpay
    const count3 = await Transaction.countDocuments({
      userType: 'male',
      operationType: 'coin',
      paymentGateway: 'razorpay'
    });
    console.log('Male coin transactions with paymentGateway = razorpay:', count3);
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPaymentGatewayField();