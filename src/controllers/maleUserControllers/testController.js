// Test Razorpay configuration
exports.testRazorpay = async (req, res) => {
  try {
    // Check environment variables
    const hasKeyId = !!process.env.RAZORPAY_KEY_ID;
    const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET;
    
    if (!hasKeyId || !hasKeySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay environment variables not set',
        details: {
          hasKeyId,
          hasKeySecret,
          keyId: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not set',
          keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set'
        }
      });
    }

    // Test Razorpay connection
    const razorpay = require('../../config/razorpay');
    
    // Try to create a test order
    const testOrder = await razorpay.orders.create({
      amount: 100, // 1 rupee
      currency: 'INR',
      receipt: 'test_order'
    });

    res.json({
      success: true,
      message: 'Razorpay is configured correctly',
      data: {
        orderId: testOrder.id,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Razorpay test error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      details: {
        hasKeyId: !!process.env.RAZORPAY_KEY_ID,
        hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET
      }
    });
  }
};
