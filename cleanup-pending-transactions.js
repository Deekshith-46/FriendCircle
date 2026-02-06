require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');

async function cleanupPendingTransactions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Find all PENDING transactions that are NOT payment-related
    // These are the ones that should be SUCCESS
    const pendingTransactions = await Transaction.find({
      status: 'PENDING',
      $or: [
        // Manual admin operations
        { message: { $regex: /Balance (Added|Credited|Debited)/i } },
        // Referral bonuses
        { message: { $regex: /Referral (bonus|signup)/i } },
        // Admin operations without payment gateway
        { 
          paymentGateway: { $exists: false },
          $or: [
            { message: { $regex: /admin/i } },
            { message: { $regex: /manual/i } },
            { createdBy: { $exists: true } }
          ]
        }
      ]
    });
    
    console.log(`Found ${pendingTransactions.length} PENDING transactions to fix`);
    
    let fixedCount = 0;
    
    for (const txn of pendingTransactions) {
      try {
        console.log(`Fixing transaction ${txn._id}: "${txn.message}"`);
        await Transaction.updateOne(
          { _id: txn._id },
          { $set: { status: 'SUCCESS' } }
        );
        fixedCount++;
      } catch (error) {
        console.error(`Failed to fix transaction ${txn._id}:`, error.message);
      }
    }
    
    // Count remaining PENDING transactions (legitimate ones)
    const remainingPending = await Transaction.countDocuments({
      status: 'PENDING'
    });
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`✅ Fixed transactions: ${fixedCount}`);
    console.log(`📋 Remaining PENDING transactions: ${remainingPending}`);
    console.log(`   (These should be legitimate call/gift transactions)`);
    
    if (remainingPending > 0) {
      console.log(`\n🔍 Remaining PENDING transactions:`);
      const samples = await Transaction.find({ status: 'PENDING' }).limit(5);
      samples.forEach(txn => {
        console.log(`  - ${txn._id}: ${txn.message} (${txn.operationType})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from database');
  }
}

// Run the cleanup
cleanupPendingTransactions();