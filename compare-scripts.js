// Test to compare behavior between two scripts
require('dotenv').config();
const mongoose = require('mongoose');

// Test 1: Using the path from fix-transactions.js
console.log('=== Test 1: Using relative path ===');
try {
  const Transaction1 = require('./src/models/common/Transaction');
  console.log('Transaction1 model loaded successfully');
  
  mongoose.connect(process.env.MONGO_URI).then(async () => {
    const count1 = await Transaction1.countDocuments({userType: 'male', operationType: 'coin'});
    console.log('Test 1 - Male coin transactions:', count1);
    
    const count2 = await Transaction1.countDocuments({paymentGateway: 'razorpay'});
    console.log('Test 1 - Razorpay transactions:', count2);
    
    mongoose.connection.close();
  });
} catch (error) {
  console.error('Test 1 error:', error);
}

// Test 2: Using the path from check-transactions.js (after a delay)
setTimeout(() => {
  console.log('\n=== Test 2: Using absolute path ===');
  try {
    const Transaction2 = require('./src/models/common/Transaction');
    console.log('Transaction2 model loaded successfully');
    
    mongoose.connect(process.env.MONGO_URI).then(async () => {
      const count1 = await Transaction2.countDocuments({userType: 'male', operationType: 'coin'});
      console.log('Test 2 - Male coin transactions:', count1);
      
      const count2 = await Transaction2.countDocuments({paymentGateway: 'razorpay'});
      console.log('Test 2 - Razorpay transactions:', count2);
      
      mongoose.connection.close();
    });
  } catch (error) {
    console.error('Test 2 error:', error);
  }
}, 2000);