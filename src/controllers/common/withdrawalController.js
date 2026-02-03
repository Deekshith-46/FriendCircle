const WithdrawalRequest = require('../../models/common/WithdrawalRequest');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const AgencyUser = require('../../models/agency/AgencyUser');
const Transaction = require('../../models/common/Transaction');
const razorpay = require('../../config/razorpay');
const AdminConfig = require('../../models/admin/AdminConfig');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const notificationService = require('../../services/notificationService');
const notificationEvents = require('../../constants/notificationEvents');

function ensureKycVerified(user, userType) {
  if (userType === 'female') {
    if (!user || 
        !user.kycDetails || 
        !((user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') || 
          (user.kycDetails.upi && user.kycDetails.upi.status === 'accepted'))) {
      return messages.VALIDATION.KYC_NOT_APPROVED('female');
    }
  } else if (userType === 'agency') {
    if (!user || 
        !user.kycDetails || 
        !((user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') || 
          (user.kycDetails.upi && user.kycDetails.upi.status === 'accepted'))) {
      return messages.VALIDATION.KYC_NOT_APPROVED('agency');
    }
  }
  return null;
}

// Create withdrawal request (female or agency context)
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const userType = req.originalUrl.startsWith('/female-user') ? 'female' : 'agency';
    const { coins, rupees, payoutMethod } = req.body;
    
    // Validate input - either coins or rupees must be provided
    if ((!coins && !rupees) || (coins && rupees)) {
      return res.status(400).json({ success: false, message: messages.VALIDATION.AMOUNT_REQUIRED });
    }
    
    if (coins && (isNaN(coins) || coins <= 0)) {
      return res.status(400).json({ success: false, message: messages.VALIDATION.INVALID_COIN_AMOUNT });
    }
    
    if (rupees && (isNaN(rupees) || rupees <= 0)) {
      return res.status(400).json({ success: false, message: messages.VALIDATION.INVALID_RUPEE_AMOUNT });
    }
    
    if (!['bank', 'upi'].includes(payoutMethod)) return res.status(400).json({ success: false, message: messages.VALIDATION.INVALID_PAYOUT_METHOD });
    
    const user = userType === 'female' ? await FemaleUser.findById(req.user.id) : await AgencyUser.findById(req.user.id);
    const kycError = ensureKycVerified(user, userType);
    if (kycError) return res.status(400).json({ success: false, message: kycError });
    
    // For female users, get payout details from KYC based on payoutMethodId
    let payoutDetails = null;
    if (userType === 'female') {
      // Check if payoutMethodId is provided
      const payoutMethodId = req.body.payoutMethodId;
      if (!payoutMethodId) {
        return res.status(400).json({ 
          success: false, 
          message: 'payoutMethodId is required for female users' 
        });
      }
      
      if (payoutMethod === 'bank') {
        if (!user.kycDetails || !user.kycDetails.bank || user.kycDetails.bank.status !== 'accepted' || 
            user.kycDetails.bank._id.toString() !== payoutMethodId.toString()) {
          return res.status(400).json({ success: false, message: messages.VALIDATION.BANK_DETAILS_NOT_VERIFIED });
        }
        payoutDetails = {
          accountHolderName: user.kycDetails.bank.name,
          accountNumber: user.kycDetails.bank.accountNumber,
          ifsc: user.kycDetails.bank.ifsc
        };
      } else if (payoutMethod === 'upi') {
        if (!user.kycDetails || !user.kycDetails.upi || user.kycDetails.upi.status !== 'accepted' || 
            user.kycDetails.upi._id.toString() !== payoutMethodId.toString()) {
          return res.status(400).json({ success: false, message: messages.VALIDATION.UPI_DETAILS_NOT_VERIFIED });
        }
        payoutDetails = {
          vpa: user.kycDetails.upi.upiId
        };
      }
    } else {
      // For agency users, get payout details from KYC based on payoutMethodId (same as female users)
      const payoutMethodId = req.body.payoutMethodId;
      if (!payoutMethodId) {
        return res.status(400).json({ 
          success: false, 
          message: 'payoutMethodId is required for agency users' 
        });
      }
      
      if (payoutMethod === 'bank') {
        if (!user.kycDetails || !user.kycDetails.bank || user.kycDetails.bank.status !== 'accepted' || 
            user.kycDetails.bank._id.toString() !== payoutMethodId.toString()) {
          return res.status(400).json({ success: false, message: messages.VALIDATION.BANK_DETAILS_NOT_VERIFIED });
        }
        payoutDetails = {
          accountHolderName: user.kycDetails.bank.name,
          accountNumber: user.kycDetails.bank.accountNumber,
          ifsc: user.kycDetails.bank.ifsc
        };
      } else if (payoutMethod === 'upi') {
        if (!user.kycDetails || !user.kycDetails.upi || user.kycDetails.upi.status !== 'accepted' || 
            user.kycDetails.upi._id.toString() !== payoutMethodId.toString()) {
          return res.status(400).json({ success: false, message: messages.VALIDATION.UPI_DETAILS_NOT_VERIFIED });
        }
        payoutDetails = {
          vpa: user.kycDetails.upi.upiId
        };
      }
    }
    
    // Get admin config for withdrawal settings
    const adminConfig = await AdminConfig.getConfig();
    
    // Validate required financial settings are configured
    if (adminConfig.coinToRupeeConversionRate === undefined || adminConfig.coinToRupeeConversionRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Coin to rupee conversion rate not configured by admin'
      });
    }
    
    if (adminConfig.minWithdrawalAmount === undefined || adminConfig.minWithdrawalAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount not configured by admin'
      });
    }
    
    const coinToRupeeRate = adminConfig.coinToRupeeConversionRate;
    const minWithdrawalAmount = adminConfig.minWithdrawalAmount;
    
    let coinsRequested, amountInRupees;
    
    // Convert rupees to coins if rupees provided
    if (rupees) {
      amountInRupees = Number(rupees);
      coinsRequested = Math.ceil(amountInRupees * coinToRupeeRate);
    } else {
      coinsRequested = Number(coins);
      amountInRupees = Number((coinsRequested / coinToRupeeRate).toFixed(2));
    }
    
    // Check minimum withdrawal amount
    if (amountInRupees < minWithdrawalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: messages.WITHDRAWAL.MIN_WITHDRAWAL_AMOUNT(minWithdrawalAmount),
        data: {
          minWithdrawalAmount: minWithdrawalAmount,
          requestedAmount: amountInRupees
        }
      });
    }
    
    // For female and agency users, check walletBalance; for male users, check coinBalance
    let userBalance;
    if (userType === 'female' || userType === 'agency') {
      userBalance = user.walletBalance || 0;
    } else { // male user
      userBalance = user.coinBalance || 0;
    }
    
    // Check balance
    if (userBalance < coinsRequested) {
      return res.status(400).json({ 
        success: false, 
        message: messages.WITHDRAWAL.INSUFFICIENT_BALANCE(userType === 'female' ? 'wallet' : 'coin'),
        data: {
          available: userBalance,
          required: coinsRequested,
          shortfall: coinsRequested - userBalance
        }
      });
    }
    
    // Debit from appropriate balance field
    if (userType === 'female' || userType === 'agency') {
      user.walletBalance = (user.walletBalance || 0) - coinsRequested;
    } else { // male user
      user.coinBalance = (user.coinBalance || 0) - coinsRequested;
    }
    
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      userType,
      userId: user._id,
      operationType: (userType === 'female' || userType === 'agency') ? 'wallet' : 'coin',
      action: 'debit',
      amount: coinsRequested,
      message: 'Withdrawal requested - coins debited',
      balanceAfter: (userType === 'female' || userType === 'agency') ? user.walletBalance : user.coinBalance,
      createdBy: user._id
    });
    
    const request = await WithdrawalRequest.create({
      userType,
      userId: user._id,
      coinsRequested,
      amountInRupees,
      payoutMethod,
      payoutDetails,
      status: 'pending'
    });
    
    // Notify admin about new withdrawal request
    notificationService.handleEvent(
      notificationEvents.WITHDRAWAL_REQUEST,
      {
        entityId: user._id,
        entityType: userType,
        amount: amountInRupees,
        coins: coinsRequested
      }
    );
    
    return res.status(201).json({ 
      success: true, 
      message: messages.WITHDRAWAL.WITHDRAWAL_SUCCESS,
      data: request,
      countdownTimer: 24 * 60 * 60 // 24 hours in seconds for frontend display
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// List own withdrawal requests
exports.listMyWithdrawals = async (req, res) => {
  try {
    const userType = req.originalUrl.startsWith('/female-user') ? 'female' : 'agency';
    const requests = await WithdrawalRequest.find({ userType, userId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ADMIN: list all pending/any requests
exports.adminListWithdrawals = async (req, res) => {
  try {
    const { status } = req.query; // optional
    const filter = status ? { status } : {};
    const requests = await WithdrawalRequest.find(filter).sort({ createdAt: -1 });
    
    // Populate user details for each request
    const populatedRequests = [];
    for (let request of requests) {
      const requestData = request.toObject();
      if (requestData.userType === 'female') {
        const user = await FemaleUser.findById(requestData.userId).select('name email kycStatus');
        requestData.userDetails = user;
      } else if (requestData.userType === 'agency') {
        const user = await AgencyUser.findById(requestData.userId).select('name email kycStatus');
        requestData.userDetails = user;
      }
      populatedRequests.push(requestData);
    }
    
    return res.json({ success: true, data: populatedRequests });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ADMIN: approve and pay via Razorpay Payouts
exports.adminApproveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WithdrawalRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request not pending' });
    
    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(500).json({ 
        success: false, 
        message: messages.PAYMENT.RAZORPAY_NOT_CONFIGURED
      });
    }
    
    // Check for the correct Razorpay API methods
    console.log('Razorpay API structure:');
    console.log('- Customers:', !!razorpay.customers, typeof razorpay.customers);
    console.log('- FundAccount:', !!razorpay.fundAccount, typeof razorpay.fundAccount);
    console.log('- Payments:', !!razorpay.payments, typeof razorpay.payments);
    
    // Fetch user (coins already debited at request time)
    const userModel = request.userType === 'female' ? FemaleUser : AgencyUser;
    const user = await userModel.findById(request.userId);
    if (!user) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    // No further debit here to avoid double deduction
    
    // For now, let's skip the Razorpay integration and just approve the request
    // This is a temporary solution until we can properly integrate with the new API
    request.status = 'approved';
    request.processedBy = req.admin?._id || req.staff?._id;
    await request.save();
    
    // Notify user about withdrawal approval
    notificationService.handleEvent(
      notificationEvents.WITHDRAWAL_APPROVED,
      {
        entityId: request.userId,
        entityType: request.userType,
        amount: request.amountInRupees,
        processedBy: 'admin',
        status: 'approved'
      }
    );
    
    return res.json({ success: true, message: messages.WITHDRAWAL.WITHDRAWAL_APPROVED, data: request });
  } catch (err) {
    console.error('Error approving withdrawal:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ADMIN: reject
exports.adminRejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await WithdrawalRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request not pending' });
    
    request.status = 'rejected';
    request.notes = reason;
    request.processedBy = req.admin?._id || req.staff?._id;
    await request.save();
    
    // Notify user about withdrawal rejection
    notificationService.handleEvent(
      notificationEvents.WITHDRAWAL_REJECTED,
      {
        entityId: request.userId,
        entityType: request.userType,
        amount: request.amountInRupees,
        reason,
        processedBy: 'admin',
        status: 'rejected'
      }
    );
    
    // Refund coins to user on rejection
    const userModel = request.userType === 'female' ? FemaleUser : AgencyUser;
    const user = await userModel.findById(request.userId);
    if (user) {
      // Credit back to appropriate balance field
      if (request.userType === 'female' || request.userType === 'agency') {
        user.walletBalance = (user.walletBalance || 0) + request.coinsRequested;
      } else { // male user
        user.coinBalance = (user.coinBalance || 0) + request.coinsRequested;
      }
      
      await user.save();
      
      await Transaction.create({
        userType: request.userType,
        userId: user._id,
        operationType: (request.userType === 'female' || request.userType === 'agency') ? 'wallet' : 'coin',
        action: 'credit',
        amount: request.coinsRequested,
        message: 'Withdrawal rejected - coins refunded',
        balanceAfter: (request.userType === 'female' || request.userType === 'agency') ? user.walletBalance : user.coinBalance,
        createdBy: req.admin?._id || req.staff?._id
      });
    }
    
    return res.json({ success: true, message: messages.WITHDRAWAL.WITHDRAWAL_REJECTED });
  } catch (err) {
    console.error('Error rejecting withdrawal:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get user balance with rupee conversion
exports.getMyBalance = async (req, res) => {
  try {
    // Determine user type based on the route - works for both female and agency
    const isAgency = req.originalUrl.includes('/agency');
    const isFemale = req.originalUrl.includes('/female-user');
    const userType = isAgency ? 'agency' : (isFemale ? 'female' : 'female'); // default to female
    
    // Get admin config for conversion rate
    const adminConfig = await AdminConfig.getConfig();
    
    if (adminConfig.coinToRupeeConversionRate === undefined || adminConfig.coinToRupeeConversionRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Coin to rupee conversion rate not configured by admin'
      });
    }
    
    const coinRate = adminConfig.coinToRupeeConversionRate;
    
    // Get user to access balance
    let user;
    if (userType === 'female') {
      user = await FemaleUser.findById(req.user.id);
    } else {
      user = await AgencyUser.findById(req.user.id);
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    // Calculate balances based on user type
    let walletCoins;
    
    if (userType === 'female' || userType === 'agency') {
      // Female and agency users have walletBalance
      walletCoins = user.walletBalance || 0;
    } else {
      // Male users have coinBalance
      walletCoins = 0;
    }
    
    // Calculate rupee values - if 5 coins = 1 rupee, then divide by coinRate
    // But if coinRate represents coins per rupee, we need to divide
    const conversionRate = coinRate ? (1 / coinRate) : 0.2; // Default to 0.2 (5 coins = 1 rupee)
    const walletRupees = Number((walletCoins * conversionRate).toFixed(2));
    
    return res.json({
      success: true,
      data: {
        walletBalance: {
          coins: walletCoins,
          rupees: walletRupees
        },
        conversionRate: {
          coinsPerRupee: coinRate,
          rupeesPerCoin: conversionRate
        }
      }
    });
  } catch (err) {
    console.error('Error getting balance:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// List user transactions
exports.listMyTransactions = async (req, res) => {
  try {
    const userType = req.originalUrl.startsWith('/female-user') ? 'female' : 'agency';
    const { operationType, startDate, endDate } = req.query;
    
    // Build filter
    let filter = { userId: req.user.id };
    
    filter.userType = userType;
    
    if (operationType && ['wallet', 'coin'].includes(operationType)) {
      filter.operationType = operationType;
    }
    
    // Handle date range filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // End of the day
        filter.createdAt.$lte = endDateTime;
      }
    }
    
    // Get transactions
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      data: transactions
    });
  } catch (err) {
    console.error('Error getting transactions:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get available payout methods for the user
exports.getAvailablePayoutMethods = async (req, res) => {
  try {
    const userType = req.originalUrl.startsWith('/female-user') ? 'female' : 'agency';
    
    // Get user to access their KYC details
    const user = userType === 'female' ? await FemaleUser.findById(req.user.id) : await AgencyUser.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    // Get admin config for conversion rate
    const adminConfig = await AdminConfig.getConfig();
    
    // Validate required financial settings are configured
    if (adminConfig.coinToRupeeConversionRate === undefined || adminConfig.coinToRupeeConversionRate === null) {
      return res.status(400).json({
        success: false,
        message: 'Coin to rupee conversion rate not configured by admin'
      });
    }
    
    const coinToRupeeRate = adminConfig.coinToRupeeConversionRate;
    
    const walletBalance = user.walletBalance || 0;
    
    // If 5 coins = 1 rupee, then conversion rate is 1/5 = 0.2
    const conversionRate = coinToRupeeRate ? (1 / coinToRupeeRate) : 0.2;
    
    const walletBalanceInRupees = Number((walletBalance * conversionRate).toFixed(2));
    
    const response = {
      success: true,
      data: {
        // Wallet balance information
        walletBalance: {
          coins: walletBalance,
          rupees: walletBalanceInRupees
        },
        conversionRate: {
          coinsPerRupee: coinToRupeeRate,
          rupeesPerCoin: conversionRate
        },
        // Payout methods
        payoutMethods: {}
      }
    };
    
    // Check for bank details in KYC
    if (user.kycDetails && user.kycDetails.bank) {
      response.data.payoutMethods.bank = {
        id: user.kycDetails.bank._id,
        accountNumber: user.kycDetails.bank.accountNumber,
        ifsc: user.kycDetails.bank.ifsc,
        status: user.kycDetails.bank.status
      };
    }
    
    // Check for UPI details in KYC
    if (user.kycDetails && user.kycDetails.upi) {
      response.data.payoutMethods.upi = {
        id: user.kycDetails.upi._id,
        upiId: user.kycDetails.upi.upiId,
        status: user.kycDetails.upi.status
      };
    }
    
    return res.json(response);
  } catch (err) {
    console.error('Error getting payout methods:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};