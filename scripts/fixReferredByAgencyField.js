// Migration script to fix referredByAgency field values
// Run with: node scripts/fixReferredByAgencyField.js

require('dotenv').config();
const mongoose = require('mongoose');
const FemaleUser = require('../src/models/femaleUser/FemaleUser');

async function fixReferredByAgencyField() {
  try {
    console.log('🚀 Starting referredByAgency field fix...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all FemaleUsers where referredByAgency is an array (problematic records)
    console.log('\n🔍 Finding FemaleUser records with referredByAgency as array...');
    
    const problematicUsers = await FemaleUser.find({
      referredByAgency: { $type: 'array' }
    });
    
    console.log(`Found ${problematicUsers.length} users with array-type referredByAgency`);
    
    let fixedCount = 0;
    for (const user of problematicUsers) {
      console.log(`\nFixing user: ${user.email} (ID: ${user._id})`);
      console.log(`  - Old value: ${JSON.stringify(user.referredByAgency)} (type: ${Array.isArray(user.referredByAgency) ? 'array' : typeof user.referredByAgency})`);
      
      // Convert array to null if empty, or to single value if has content
      let newValue = null;
      if (Array.isArray(user.referredByAgency) && user.referredByAgency.length > 0) {
        // If array has content, take the first element (assuming it's an ObjectId)
        newValue = user.referredByAgency[0];
      }
      
      // Use $set to update the field directly
      await FemaleUser.updateOne(
        { _id: user._id },
        { $set: { referredByAgency: newValue } }
      );
      
      console.log(`  - New value: ${newValue} (type: ${typeof newValue})`);
      fixedCount++;
    }
    
    // Double-check that we fixed them by finding any remaining problematic records
    const remainingProblematic = await FemaleUser.find({
      referredByAgency: { $type: 'array' }
    });
    
    console.log(`\n✅ Migration completed!`);
    console.log(`Fixed: ${fixedCount} users`);
    console.log(`Remaining problematic records: ${remainingProblematic.length}`);
    
    if (remainingProblematic.length > 0) {
      console.log('\nRemaining problematic users:');
      for (const user of remainingProblematic) {
        console.log(`  - ${user.email} (ID: ${user._id}): ${JSON.stringify(user.referredByAgency)}`);
      }
    } else {
      console.log('\n🎉 All problematic records have been fixed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
fixReferredByAgencyField();