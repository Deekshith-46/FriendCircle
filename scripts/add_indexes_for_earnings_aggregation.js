/**
 * Script to add MongoDB indexes for improved performance of earnings aggregation queries
 * These indexes are crucial for the Female Earnings Breakdown Per Male feature
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function addIndexes() {
  try {
    // Connect to MongoDB
    const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/friend-circle';
    await mongoose.connect(dbUrl);
    
    console.log('Connected to MongoDB');

    // Get collections
    const db = mongoose.connection.db;
    
    // Add indexes for CallHistory collection
    const callHistoryCollection = db.collection('callhistories');
    
    // Index for receiverId + callerId + status (used in earnings aggregation)
    await callHistoryCollection.createIndex(
      { receiverId: 1, callerId: 1, status: 1 },
      { name: 'receiver_caller_status_idx' }
    );
    
    // Also create separate indexes for individual fields if they don't exist
    await callHistoryCollection.createIndex({ receiverId: 1 }, { name: 'receiverId_idx' });
    await callHistoryCollection.createIndex({ callerId: 1 }, { name: 'callerId_idx' });
    await callHistoryCollection.createIndex({ status: 1 }, { name: 'status_idx' });
    
    console.log('Created indexes for callhistories collection');

    // Add indexes for GiftReceived collection
    const giftReceivedCollection = db.collection('giftreceiveds');
    
    // Index for receiverId + senderId (used in earnings aggregation)
    await giftReceivedCollection.createIndex(
      { receiverId: 1, senderId: 1 },
      { name: 'receiver_sender_idx' }
    );
    
    // Also create separate indexes for individual fields if they don't exist
    await giftReceivedCollection.createIndex({ receiverId: 1 }, { name: 'receiverId_idx' });
    await giftReceivedCollection.createIndex({ senderId: 1 }, { name: 'senderId_idx' });
    
    console.log('Created indexes for giftreceiveds collection');

    console.log('All indexes created successfully!');
    console.log('\nThese indexes will improve performance for:');
    console.log('- Female Earnings Breakdown Per Male feature');
    console.log('- Following/Followers lists with earnings data');
    console.log('- Individual earnings queries');

  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

// Run the script
if (require.main === module) {
  addIndexes().then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = addIndexes;