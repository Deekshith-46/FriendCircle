require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');

async function checkTransactionStructure() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    const txn = await Transaction.findOne({userType: 'male', operationType: 'coin'});
    const txnObj = txn.toObject();
    
    console.log('Transaction structure:');
    console.log('- All fields:', Object.keys(txnObj));
    console.log('- status:', txnObj.status);
    console.log('- paymentGateway:', txnObj.paymentGateway);
    console.log('- orderId:', txnObj.orderId);
    console.log('- paymentId:', txnObj.paymentId);
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTransactionStructure();