require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    const txns = await Transaction.find({paymentGateway: 'razorpay'})
      .select('status orderId amount operationType userId createdAt')
      .populate('userId', 'firstName lastName email');
    
    console.log(`Found ${txns.length} Razorpay transactions:`);
    
    txns.forEach(t => {
      console.log(`- ${t._id}: ${t.status} - ${t.operationType} - ₹${t.amount} - ${t.userId?.firstName || 'Unknown'} ${t.userId?.lastName || ''} - ${t.createdAt}`);
    });
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTransactions();