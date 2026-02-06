const express = require('express');
const app = express();
const connectDB = require('./config/db');

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory
const cors = require('cors');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));



// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Dating App API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      admin: '/admin/login',
      maleUser: '/male-user/register',
      femaleUser: '/female-user/register',
      agency: '/agency/register'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

// Routes
app.use('/admin', require('./routes/adminRoutes/admin'));
app.use('/admin/interests', require('./routes/adminRoutes/interest'));
app.use('/admin/languages', require('./routes/adminRoutes/language'));
app.use('/admin/religions', require('./routes/adminRoutes/religion'));
app.use('/admin/relation-goals', require('./routes/adminRoutes/relationGoal'));
app.use('/admin/gifts', require('./routes/adminRoutes/gift'));
app.use('/admin/pages', require('./routes/adminRoutes/page'));
app.use('/admin/faqs', require('./routes/adminRoutes/faq'));
app.use('/admin/plans', require('./routes/adminRoutes/plan'));
app.use('/admin/packages', require('./routes/adminRoutes/package'));
app.use('/admin/staff', require('./routes/adminRoutes/staff'));
app.use('/admin/users', require('./routes/adminRoutes/users'));
app.use('/admin/rewards', require('./routes/adminRoutes/reward'));
app.use('/admin/reward-rules', require('./routes/adminRoutes/newRewardRoutes'));
app.use('/admin/payouts', require('./routes/adminRoutes/payoutRoutes'));
app.use('/admin/top-fan-config', require('./routes/adminRoutes/topFanConfig'));
app.use('/admin/top-fans', require('./routes/adminRoutes/adminTopFans'));
app.use('/admin/earnings', require('./routes/adminRoutes/earningsRoutes'));


// Routes for Female User
app.use('/female-user', require('./routes/femaleUserRoutes/femaleUserRoutes'));  // Female User Registration & Info
// Routes for Female User
app.use('/female-user/favourites', require('./routes/femaleUserRoutes/favouritesRoutes'));  // Favourites Routes for FemaleUser
app.use('/female-user/chat', require('./routes/femaleUserRoutes/chatRoutes'));  // Female User Chat
app.use('/female-user/earnings', require('./routes/femaleUserRoutes/earningsRoutes'));  // Female User Earnings
app.use('/female-user/kyc', require('./routes/femaleUserRoutes/kycRoutes'));  // KYC Routes
app.use('/female-user/withdrawals', require('./routes/femaleUserRoutes/withdrawalRoutes'));  // Withdrawal Routes
app.use('/female-user/block-list', require('./routes/femaleUserRoutes/blockListRoutes'));  // Blocklist Routes
app.use('/female-user', require('./routes/femaleUserRoutes/scoreRoutes'));  // Score Routes (mounted directly under /female-user)
app.use('/female-user', require('./routes/femaleUserRoutes/deleteAccountRoutes')); // Female User Delete Account

// Routes for Male User
app.use('/male-user', require('./routes/maleUserRoutes/maleUserRoutes')); // Male User Routes
app.use('/male-user', require('./routes/maleUserRoutes/deleteAccountRoutes')); // Male User Delete Account
// Routes for Male User
app.use('/male-user/favourites', require('./routes/maleUserRoutes/favouritesRoutes'));  // Favourites Routes
app.use('/male-user/chat', require('./routes/maleUserRoutes/chatRoutes')); // Chat Routes
app.use('/male-user/block-list', require('./routes/maleUserRoutes/blockListRoutes')); // Block List Routes
app.use('/male-user/profile', require('./routes/maleUserRoutes/profileRoutes')); // Profile Routes
app.use('/male-user/payment', require('./routes/maleUserRoutes/paymentRoutes')); // Payment Routes
app.use('/male-user/gifts', require('./routes/maleUserRoutes/giftRoutes')); // Gift Routes

// Routes for Agency User
app.use('/agency', require('./routes/agencyRoutes/agencyUserRoutes')); // Main Agency Routes
app.use('/agency/referrals', require('./routes/agencyRoutes/referralRoutes')); // Agency Referral Routes
app.use('/agency', require('./routes/agencyRoutes/deleteAccountRoutes')); // Agency User Delete Account

// Common routes
app.use('/chat', require('./routes/common/chatRoutes'));
app.use('/notification', require('./routes/common/notificationRoutes'));
app.use('/notification-panel', require('./routes/common/notificationPanelRoutes'));

// Error middleware
app.use(require('./middlewares/errorMiddleware'));

module.exports = app;
