// Simple fix script that works with the actual data structure
require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/common/Transaction');
const AdminEarning = require('./src/models/admin/AdminEarning');
const Payment = require('./src/models/maleUser/Payment');
const AdminPackage = require('./src/models/admin/Package');

async function simpleFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Find all male coin transactions (these are the ones we know exist)
    const transactions = await Transaction.find({
      userType: 'male',
      operationType: 'coin'
    }).populate('userId', 'firstName lastName email');
    
    console.log(`Found ${transactions.length} male coin transactions`);
    
    let updatedCount = 0;
    let earningsCreated = 0;
    
    for (const transaction of transactions) {
      try {
        // Check if this transaction already has an admin earning
        const existingEarning = await AdminEarning.findOne({
          transactionId: transaction._id
        });
        
        if (existingEarning) {
          console.log(`Transaction ${transaction._id} already has admin earning`);
          continue;
        }
        
        // For male coin transactions, we need to find the corresponding payment
        // and package to create the admin earning
        if (transaction.message && transaction.message.includes('Coin recharge via Razorpay')) {
          // Extract order ID from message
          const orderIdMatch = transaction.message.match(/Order: ([^\s]+)/);
          if (orderIdMatch) {
            const orderId = orderIdMatch[1];
            
            // Find the payment record
            const payment = await Payment.findOne({
              razorpayOrderId: orderId,
              user: transaction.userId._id
            });
            
            if (payment && payment.status === 'completed' && payment.packageId) {
              console.log(`Creating admin earning for transaction ${transaction._id}`);
              
              // Get package info
              const pkg = await AdminPackage.findById(payment.packageId);
              if (pkg) {
                const adminEarning = await AdminEarning.create({
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
                
                // Update transaction status and link admin earning
                transaction.status = 'SUCCESS';
                transaction.adminEarningId = adminEarning._id;
                transaction.paymentGateway = 'razorpay';
                transaction.orderId = orderId;
                transaction.paymentId = payment.razorpayPaymentId;
                await transaction.save();
                
                updatedCount++;
                earningsCreated++;
                console.log(`✅ Created earning: ₹${pkg.amount}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction._id}:`, error.message);
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Transactions updated: ${updatedCount}`);
    console.log(`💰 Admin earnings created: ${earningsCreated}`);
    
    // Show total earnings
    const totalEarnings = await AdminEarning.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log(`\n💰 TOTAL ADMIN EARNINGS: ₹${totalEarnings[0]?.total || 0}`);
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected');
  } catch (error) {
    console.error('Error:', error);
  }
}

simpleFix();