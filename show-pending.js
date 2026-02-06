require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');

async function showPending() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    const pending = await Transaction.find({status: 'PENDING'}).select('message status createdAt');
    console.log('PENDING transactions:');
    pending.forEach(t => {
      console.log(`- ${t.createdAt?.toISOString()} - ${t.message}`);
    });
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

showPending();