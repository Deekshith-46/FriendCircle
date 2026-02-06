require('dotenv').config();
const mongoose = require('mongoose');
const AdminEarning = require('./src/models/admin/AdminEarning');

async function migrateAdminEarnings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Find all admin earnings without fromUserModel field
    const earnings = await AdminEarning.find({
      fromUserModel: { $exists: false }
    });
    
    console.log(`Found ${earnings.length} earnings to migrate`);
    
    let migratedCount = 0;
    
    for (const earning of earnings) {
      try {
        // Map fromUserType to fromUserModel
        let fromUserModel;
        switch (earning.fromUserType) {
          case 'male':
            fromUserModel = 'MaleUser';
            break;
          case 'female':
            fromUserModel = 'FemaleUser';
            break;
          case 'agency':
            fromUserModel = 'AgencyUser';
            break;
          default:
            console.log(`⚠️  Unknown fromUserType: ${earning.fromUserType} for earning ${earning._id}`);
            continue;
        }
        
        // Update the document
        await AdminEarning.updateOne(
          { _id: earning._id },
          { $set: { fromUserModel: fromUserModel } }
        );
        
        console.log(`✅ Migrated earning ${earning._id}: ${earning.fromUserType} -> ${fromUserModel}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating earning ${earning._id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`❌ Failed to migrate: ${earnings.length - migratedCount}`);
    
    // Verify the migration
    const totalAfterMigration = await AdminEarning.countDocuments({
      fromUserModel: { $exists: true }
    });
    
    console.log(`\n✅ Total earnings with fromUserModel field: ${totalAfterMigration}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from database');
  }
}

// Run the migration
migrateAdminEarnings();