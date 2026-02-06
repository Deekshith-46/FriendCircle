require('dotenv').config();

const express = require('express');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./socket');
const { assignWeeklyLevels } = require('./jobs/levelAssignmentJob');
const { notificationCleanupJob } = require('./jobs/notificationCleanupJob');
const PORT = process.env.PORT || 5001;

// Connect to database and start server
connectDB().then(() => {
  // Initialize notification cleanup job after DB connection
  notificationCleanupJob.schedule();
  
  const server = http.createServer(app);
  
  // Initialize Socket.IO
  initSocket(server);
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Server started successfully');
    
    // Optional: Schedule weekly level assignment job if node-cron is available
    try {
      const cron = require('node-cron');
      // Schedule weekly level assignment job to run every Monday at 12:05 AM
      // This runs after the week ends to calculate the previous week's (Sunday to Saturday) earnings
      cron.schedule('5 0 * * 1', async () => {
        console.log('Running weekly level assignment job...');
        try {
          await assignWeeklyLevels();
        } catch (error) {
          console.error('Error in scheduled level assignment job:', error);
        }
      });
      console.log('Weekly level assignment job scheduled to run every Monday at 12:05 AM');
    } catch (error) {
      console.log('node-cron not available. Weekly level assignment will need to be run manually using:');
      console.log('node src/jobs/levelAssignmentJob.js --run');
    }
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      notificationCleanupJob.stop(); // Stop the notification cleanup job
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      notificationCleanupJob.stop(); // Stop the notification cleanup job
      process.exit(0);
    });
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
