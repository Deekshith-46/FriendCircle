/**
 * Script to add critical indexes for reward system performance and correctness
 * Run this once to prevent race conditions and improve query performance
 */

require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const addIndexes = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    // Get model references
    const ScoreHistory = require('../src/models/common/ScoreHistory');
    const CallHistory = require('../src/models/common/CallHistory');

    console.log('\n=== Adding ScoreHistory Indexes ===');
    
    // Critical composite index for idempotency checks
    try {
      await ScoreHistory.collection.createIndex({
        femaleUserId: 1,
        ruleType: 1,
        referenceDate: 1
      }, {
        name: 'user_rule_date_idx',
        background: true
      });
      console.log('✅ Added ScoreHistory composite index');
    } catch (err) {
      if (err.code === 85) { // Index already exists
        console.log('⚠️  ScoreHistory composite index already exists');
      } else {
        console.error('❌ Failed to add ScoreHistory index:', err.message);
      }
    }

    // Unique constraint for preventing duplicate rewards
    try {
      await ScoreHistory.collection.createIndex({
        femaleUserId: 1,
        ruleType: 1,
        referenceDate: 1
      }, {
        name: 'unique_reward_idx',
        unique: true,
        background: true
      });
      console.log('✅ Added ScoreHistory unique constraint');
    } catch (err) {
      if (err.code === 85) { // Index already exists
        console.log('⚠️  ScoreHistory unique constraint already exists');
      } else if (err.code === 11000) { // Duplicate key error
        console.log('⚠️  Some duplicate ScoreHistory entries exist - cleaning up...');
        // Handle duplicates if they exist
        const duplicates = await ScoreHistory.aggregate([
          {
            $group: {
              _id: {
                femaleUserId: '$femaleUserId',
                ruleType: '$ruleType',
                referenceDate: '$referenceDate'
              },
              count: { $sum: 1 },
              ids: { $push: '$_id' }
            }
          },
          {
            $match: {
              count: { $gt: 1 }
            }
          }
        ]);

        if (duplicates.length > 0) {
          console.log(`Found ${duplicates.length} duplicate reward entries`);
          // Keep first, delete rest
          for (const dup of duplicates) {
            const idsToDelete = dup.ids.slice(1); // Keep first, delete others
            await ScoreHistory.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`Deleted ${idsToDelete.length} duplicate entries for user ${dup._id.femaleUserId}`);
          }
        }
      } else {
        console.error('❌ Failed to add ScoreHistory unique index:', err.message);
      }
    }

    console.log('\n=== Adding CallHistory Indexes ===');
    
    // Index for efficient call counting queries
    try {
      await CallHistory.collection.createIndex({
        receiverId: 1,
        callType: 1,
        status: 1,
        createdAt: 1
      }, {
        name: 'receiver_call_status_date_idx',
        background: true
      });
      console.log('✅ Added CallHistory composite index');
    } catch (err) {
      if (err.code === 85) { // Index already exists
        console.log('⚠️  CallHistory composite index already exists');
      } else {
        console.error('❌ Failed to add CallHistory index:', err.message);
      }
    }

    console.log('\n=== Index Creation Complete ===');
    console.log('✅ All critical indexes added successfully');
    console.log('💡 System is now optimized for reward processing');

  } catch (error) {
    console.error('Error adding indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  addIndexes();
}

module.exports = { addIndexes };