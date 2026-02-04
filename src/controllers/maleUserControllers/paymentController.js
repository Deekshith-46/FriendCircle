const razorpay = require('../../config/razorpay');
const Payment = require('../../models/maleUser/Payment');
const AdminPackage = require('../../models/admin/Package');
const Transaction = require('../../models/common/Transaction');
const MaleUser = require('../../models/maleUser/MaleUser');
const crypto = require('crypto');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');

// Create Razorpay order for wallet recharge
exports.createWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body; // Amount in rupees
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: messages.PAYMENT.INVALID_AMOUNT });
    }
    
    const amountInPaise = amount * 100;

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: messages.PAYMENT.RAZORPAY_NOT_CONFIGURED });
    }

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `w_${Date.now()}`, // Shortened receipt (max 40 chars)
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = new Payment({
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      type: 'wallet',
      walletAmount: amount
    });
    await payment.save();

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Wallet order creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create Razorpay order for coin recharge
exports.createCoinOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = await AdminPackage.findById(packageId);
    
    if (!pkg || pkg.status !== 'publish') {
      return res.status(400).json({ success: false, message: messages.PAYMENT.INVALID_PACKAGE });
    }

    const amountInPaise = pkg.amount * 100;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `c_${Date.now()}`, // Shortened receipt (max 40 chars),
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = new Payment({
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      type: 'coin',
      coinsReceived: pkg.coin,
      packageId: pkg._id
    });
    await payment.save();

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        coins: pkg.coin
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Verify payment and update user balance
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // // Verify signature
    // // const generated_signature = crypto
    // //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    // //   .update(razorpay_order_id + '|' + razorpay_payment_id)
    // //   .digest('hex');

    // // if (generated_signature !== razorpay_signature) {
    // //   return res.status(400).json({ success: false, message: 'Invalid signature' });
    // // }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'completed';
    await payment.save();

    // Update user balance and create transaction
    const user = await MaleUser.findById(req.user.id);
    let transaction;

    if (payment.type === 'wallet') {
      user.walletBalance = (user.walletBalance || 0) + payment.walletAmount;
      await user.save();

      transaction = await Transaction.create({
        userType: 'male',
        userId: user._id,
        operationType: 'wallet',
        action: 'credit',
        amount: payment.walletAmount,
        message: `Wallet recharge via Razorpay - Order: ${payment.razorpayOrderId}`,
        balanceAfter: user.walletBalance,
        createdBy: user._id
      });
    } else if (payment.type === 'coin') {
      user.coinBalance = (user.coinBalance || 0) + payment.coinsReceived;
      await user.save();

      transaction = await Transaction.create({
        userType: 'male',
        userId: user._id,
        operationType: 'coin',
        action: 'credit',
        amount: payment.coinsReceived,
        message: `Coin recharge via Razorpay - Order: ${payment.razorpayOrderId}`,
        balanceAfter: user.coinBalance,
        createdBy: user._id
      });
    }

    // Link transaction to payment
    payment.transactionId = transaction._id;
    await payment.save();

    res.json({
      success: true,
      message: messages.PAYMENT.PAYMENT_VERIFIED,
      data: {
        paymentId: payment._id,
        transactionId: transaction._id,
        walletBalance: user.walletBalance,
        coinBalance: user.coinBalance
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get coin packages options
exports.getCoinPricing = async (req, res) => {
  try {
    const packages = await AdminPackage.find({ status: 'publish' }).sort({ amount: 1 }).select('coin amount status');
    res.json({ success: true, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('packageId', 'amount coin')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};