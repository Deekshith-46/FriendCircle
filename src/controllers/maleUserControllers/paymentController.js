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
    console.log('🔥 VERIFY PAYMENT API HIT 🔥', req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // 🔐 CRITICAL: Verify Razorpay signature (SECURITY)
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

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
        createdBy: user._id,
        paymentGateway: 'razorpay',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'SUCCESS'
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
        createdBy: user._id,
        paymentGateway: 'razorpay',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'SUCCESS'
      });
    }

    // Link transaction to payment
    payment.transactionId = transaction._id;
    await payment.save();

    // 🧾 Create Admin Earning Record (Bookkeeping)
    const AdminEarning = require('../../models/admin/AdminEarning');
    const AdminPackage = require('../../models/admin/Package');
    
    let adminEarning;
    if (payment.type === 'coin') {
      // For coin purchases, admin earns the full package amount
      const pkg = await AdminPackage.findById(payment.packageId);
      if (pkg) {
        adminEarning = await AdminEarning.create({
          source: 'PACKAGE_PURCHASE',
          fromUserType: 'male',
          fromUserModel: 'MaleUser',
          fromUserId: user._id,
          amount: pkg.amount,
          transactionId: transaction._id,
          paymentId: payment._id,
          packageId: payment.packageId,
          metadata: {
            packageName: pkg.name,
            packageAmount: pkg.amount,
            coinsReceived: payment.coinsReceived
          }
        });
        
        // Link admin earning to transaction
        transaction.adminEarningId = adminEarning._id;
        await transaction.save();
      }
    } else if (payment.type === 'wallet') {
      // For wallet recharges, admin earns a small percentage (e.g., 2% service fee)
      const serviceFee = payment.walletAmount * 0.02; // 2% service fee
      if (serviceFee > 0) {
        adminEarning = await AdminEarning.create({
          source: 'WALLET_RECHARGE',
          fromUserType: 'male',
          fromUserModel: 'MaleUser',
          fromUserId: user._id,
          amount: serviceFee,
          transactionId: transaction._id,
          paymentId: payment._id,
          metadata: {
            walletAmount: payment.walletAmount,
            serviceFee: serviceFee
          }
        });
        
        // Link admin earning to transaction
        transaction.adminEarningId = adminEarning._id;
        await transaction.save();
      }
    }

    res.json({
      success: true,
      message: messages.PAYMENT.PAYMENT_VERIFIED,
      data: {
        paymentId: payment._id,
        transactionId: transaction._id,
        adminEarningId: adminEarning?._id,
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