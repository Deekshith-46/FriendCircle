const Razorpay = require('razorpay');

let razorpayInstance = null;

// Only initialize Razorpay if credentials are available
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (error) {
    console.error('Failed to initialize Razorpay:', error.message);
    razorpayInstance = null;
  }
} else {
  console.warn('Razorpay credentials not found in environment variables. Payout functionality will be disabled.');
  razorpayInstance = null;
}

module.exports = razorpayInstance;