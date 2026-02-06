// Simple fix script to update existing transactions and create missing admin earnings
// Run this once to fix the data inconsistency

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Import models
const Transaction = require('./src/models/common/Transaction');
const AdminEarning = require('./src/models/admin/AdminEarning');
const Payment = require('./src/models/maleUser/Payment');
const AdminPackage = require('./src/models/admin/Package');

async function fixTransactions() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    console.log('Database URI:', process.env.MONGO_URI.substring(0, 50) + '...');
    
    // Debug: Check if we can find any transactions at all
    const totalCount = await Transaction.countDocuments({});
    console.log('Total transactions in DB:', totalCount);
    
    const razorpayCount = await Transaction.countDocuments({paymentGateway: 'razorpay'});
    console.log('Razorpay transactions:', razorpayCount);
    
    const pendingCount = await Transaction.countDocuments({status: 'PENDING'});
    console.log('Pending transactions:', pendingCount);
    
    const maleCoinCount = await Transaction.countDocuments({userType: 'male', operationType: 'coin'});
    console.log('Male coin transactions:', maleCoinCount);
    
    // Find all pending Razorpay transactions (including those without orderId)
    const pendingTransactions = await Transaction.find({
      paymentGateway: 'razorpay',
      status: 'PENDING'
    }).populate('userId', 'firstName lastName email');
    
    console.log(`🔍 Found ${pendingTransactions.length} pending transactions`);
    
    let updatedCount = 0;
    let earningsCreated = 0;
    
    for (const transaction of pendingTransactions) {
      try {
        console.log(`\n🔧 Processing transaction: ${transaction._id}`);
        
        // Find corresponding payment
        const payment = await Payment.findOne({
          razorpayOrderId: transaction.orderId,
          user: transaction.userId._id
        });
        
        if (payment && payment.status === 'completed') {
          console.log('✅ Payment completed, updating transaction');
          
          // Update transaction status
          transaction.status = 'SUCCESS';
          await transaction.save();
          updatedCount++;
          
          // Check if admin earning exists
          const existingEarning = await AdminEarning.findOne({
            transactionId: transaction._id
          });
          
          if (!existingEarning) {
            console.log('🧾 Creating admin earning');
            
            let adminEarning;
            if (transaction.operationType === 'coin' && payment.packageId) {
              const pkg = await AdminPackage.findById(payment.packageId);
              if (pkg) {
                adminEarning = await AdminEarning.create({
                  source: 'PACKAGE_PURCHASE',
                  fromUserType: 'male',
                  fromUserModel: 'MaleUser',
                  fromUserId: transaction.userId._id,
                  amount: pkg.amount,
                  transactionId: transaction._id,
                  paymentId: payment._id,
                  packageId: payment.packageId,
                  metadata: {
                    packageName: pkg.name,
                    packageAmount: pkg.amount,
                    coinsReceived: payment.coinsReceived
                  }
                });
                earningsCreated++;
                console.log(`💰 Created earning: ₹${pkg.amount}`);
              }
            } else if (transaction.operationType === 'wallet') {
              const serviceFee = transaction.amount * 0.02;
              if (serviceFee > 0) {
                adminEarning = await AdminEarning.create({
                  source: 'WALLET_RECHARGE',
                  fromUserType: 'male',
                  fromUserModel: 'MaleUser',
                  fromUserId: transaction.userId._id,
                  amount: serviceFee,
                  transactionId: transaction._id,
                  paymentId: payment._id,
                  metadata: {
                    walletAmount: transaction.amount,
                    serviceFee: serviceFee
                  }
                });
                earningsCreated++;
                console.log(`💰 Created earning (service fee): ₹${serviceFee}`);
              }
            }
            
            // Link admin earning to transaction
            if (adminEarning) {
              transaction.adminEarningId = adminEarning._id;
              await transaction.save();
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing transaction: ${error.message}`);
      }
    }
    
    // Show results
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Transactions updated: ${updatedCount}`);
    console.log(`💰 Admin earnings created: ${earningsCreated}`);
    
    // Show total earnings
    const totalEarnings = await AdminEarning.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log(`\n💰 TOTAL ADMIN EARNINGS: ₹${totalEarnings[0]?.total || 0}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from database');
  }
}

// Run the fix
fixTransactions();