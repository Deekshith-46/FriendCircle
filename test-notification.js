const mongoose = require('mongoose');
const notificationService = require('./src/services/notificationService');
const FemaleUser = require('./src/models/femaleUser/FemaleUser');

async function testAdminNotification() {
  console.log('Testing admin notification system...');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Get a real female user ID
    const user = await FemaleUser.findOne({}).select('_id');
    if (!user) {
      console.log('❌ No female users found in database');
      return;
    }
    
    console.log(`Testing with user ID: ${user._id}`);
    
    // Test account approved notification
    const result = await notificationService.handleEvent('ACCOUNT_APPROVED', {
      userId: user._id.toString(),
      userType: 'female',
      approvedBy: 'admin123'
    });
    
    console.log('Notification result:', result);
    
    if (result) {
      console.log('✅ Admin notification sent successfully!');
    } else {
      console.log('❌ Failed to send admin notification');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error testing notification:', error);
  }
}

testAdminNotification();