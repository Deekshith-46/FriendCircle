// Script to remove margin fields from AdminConfig collection
// Run this once to clean up existing documents

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

async function cleanupMarginFields() {
  try {
    // Connect to database
    await connectDB();
    
    // Access the AdminConfig collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('adminconfigs'); // Note: MongoDB pluralizes
    
    // Remove the margin fields from all documents
    const result = await collection.updateMany(
      {}, // Match all documents
      { 
        $unset: { 
          marginAgencyPerMinute: "", 
          marginNonAgencyPerMinute: "",
          marginAgency: "",
          marginNonAgency: ""
        } 
      }
    );
    
    console.log(`Successfully removed margin fields from ${result.modifiedCount} document(s)`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error cleaning up margin fields:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupMarginFields();