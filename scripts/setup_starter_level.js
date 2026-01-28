// Script to set up starter level (Level-0) for new female users
// Run this once to create the starter level configuration

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const AdminLevelConfig = require('../src/models/admin/AdminLevelConfig');

async function setupStarterLevel() {
  try {
    // Connect to database
    await connectDB();
    
    // Check if Level-0 already exists
    const existingLevel0 = await AdminLevelConfig.findOne({ level: 0 });
    
    if (existingLevel0) {
      console.log('Level-0 already exists, skipping creation');
      console.log('Level-0 config:', existingLevel0.toObject());
    } else {
      // Create starter level (Level-0) for new users with 0-999 earnings
      const starterLevel = new AdminLevelConfig({
        level: 0,
        weeklyEarningsMin: 0,
        weeklyEarningsMax: 999,
        audioRatePerMinute: 40,
        videoRatePerMinute: 60,
        platformMarginPerMinute: {
          nonAgency: 10,
          agency: 15
        },
        isActive: true
      });
      
      await starterLevel.save();
      console.log('Created starter level (Level-0):', starterLevel.toObject());
    }
    
    // Also make sure Level-1 starts from 1000 to avoid overlap
    const level1 = await AdminLevelConfig.findOne({ level: 1 });
    if (level1 && level1.weeklyEarningsMin === 0) {
      level1.weeklyEarningsMin = 1000;
      await level1.save();
      console.log('Updated Level-1 to start from 1000 earnings:', level1.toObject());
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error setting up starter level:', error);
    process.exit(1);
  }
}

// Run the setup
setupStarterLevel();