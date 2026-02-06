require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    const txns = await Transaction.find().sort({createdAt: -1}).limit(10);
    console.log('Recent transactions:');
    txns.forEach(t => {
      console.log(`- ${t._id}: ${t.status} - ${t.message}`);
    });
    
    // Count by status
    const statusCounts = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\nStatus counts:');
    statusCounts.forEach(s => {
      console.log(`  ${s._id}: ${s.count}`);
    });
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTransactions();