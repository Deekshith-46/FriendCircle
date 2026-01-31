// scripts/migrateReferralData.js
// Migration script to update referral data structure
// Run with: node scripts/migrateReferralData.js

require('dotenv').config();
const mongoose = require('mongoose');
const FemaleUser = require('../src/models/femaleUser/FemaleUser');
const AgencyUser = require('../src/models/agency/AgencyUser');

async function migrateReferralData() {
  try {
    console.log('🚀 Starting referral data migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Update FemaleUser documents - convert array to single ObjectId
    console.log('\n1️⃣ Updating FemaleUser referredByAgency fields...');
    const femaleUsers = await FemaleUser.find({ 
      referredByAgency: { $exists: true, $ne: null } 
    });
    
    let femaleUpdates = 0;
    for (const user of femaleUsers) {
      if (Array.isArray(user.referredByAgency) && user.referredByAgency.length > 0) {
        // Take the first agency (should only be one anyway)
        const agencyId = user.referredByAgency[0];
        user.referredByAgency = agencyId;
        await user.save();
        femaleUpdates++;
      } else if (Array.isArray(user.referredByAgency) && user.referredByAgency.length === 0) {
        // Empty array - set to null
        user.referredByAgency = null;
        await user.save();
        femaleUpdates++;
      }
    }
    console.log(`✅ Updated ${femaleUpdates} female users`);
    
    // Step 2: Build agency → female relationships from existing data
    console.log('\n2️⃣ Building agency → female relationships...');
    const agencies = await AgencyUser.find({});
    let agencyUpdates = 0;
    
    for (const agency of agencies) {
      // Find all female users who reference this agency
      const referredFemales = await FemaleUser.find({
        referredByAgency: agency._id
      }).select('_id');
      
      const femaleIds = referredFemales.map(f => f._id);
      
      // Update agency's referredFemaleUsers array
      agency.referredFemaleUsers = femaleIds;
      await agency.save();
      agencyUpdates++;
      
      console.log(`  Agency ${agency.email}: ${femaleIds.length} referred females`);
    }
    console.log(`✅ Updated ${agencyUpdates} agencies`);
    
    // Step 3: Verify the migration
    console.log('\n3️⃣ Verifying migration results...');
    
    // Check a few agencies to verify data integrity
    const sampleAgencies = await AgencyUser.find({}).limit(3);
    for (const agency of sampleAgencies) {
      const populatedAgency = await AgencyUser.findById(agency._id)
        .populate('referredFemaleUsers', 'name email reviewStatus');
      
      console.log(`\nAgency: ${agency.email} (${agency.referralCode})`);
      console.log(`  Referred females: ${populatedAgency.referredFemaleUsers.length}`);
      populatedAgency.referredFemaleUsers.forEach(female => {
        console.log(`    - ${female.name} (${female.email}) - ${female.reviewStatus}`);
      });
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ FemaleUser.referredByAgency is now ObjectId (not array)');
    console.log('✅ AgencyUser.referredFemaleUsers populated with correct relationships');
    console.log('✅ Both sides of the relationship are now consistent');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
if (require.main === module) {
  migrateReferralData();
}

module.exports = migrateReferralData;