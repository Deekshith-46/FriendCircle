require('dotenv').config();
const mongoose = require('mongoose');
const AdminEarning = require('./src/models/admin/AdminEarning');

async function checkEarnings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    const earnings = await AdminEarning.find()
      .populate('fromUserId', 'firstName lastName email');
    
    console.log('Admin earnings:');
    earnings.forEach(e => {
      console.log('- Amount:', e.amount, 
                  'User:', e.fromUserId?.firstName, e.fromUserId?.lastName,
                  'Source:', e.source);
    });
    
    const total = await AdminEarning.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log('Total earnings:', total[0]?.total || 0);
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEarnings();