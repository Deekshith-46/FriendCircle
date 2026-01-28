const mongoose = require('mongoose');

// Global caching for Vercel serverless functions
let cachedConnection = null;

const connectDB = async () => {
  // Use cached connection in serverless environment
  if (cachedConnection) {
    return cachedConnection;
  }
  
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGO_URI:', process.env.MONGO_URI?.substring(0, 50) + '...'); // Log first 50 chars for security
    
    cachedConnection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
    });
    
    console.log('MongoDB Connected Successfully');
    return cachedConnection;
  } catch (error) {
    console.error('Database connection error details:');
    console.error('Error Name:', error.name);
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error:', error);
    throw error;
  }
};

module.exports = connectDB;
