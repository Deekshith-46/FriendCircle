const Gift = require('../../models/admin/Gift');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const Transaction = require('../../models/common/Transaction');
const GiftReceived = require('../../models/femaleUser/GiftReceived');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');

// List available gifts (published)
exports.listGifts = async (req, res) => {
  try {
    const gifts = await Gift.find({ status: 'publish' }).sort({ coin: 1 });
    return res.json({ success: true, data: gifts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Send a gift from logged-in male user to a female user
exports.sendGift = async (req, res) => {
  try {
    const { femaleUserId, giftId } = req.body;
    if (!femaleUserId || !giftId) {
      return res.status(400).json({ success: false, message: 'femaleUserId and giftId are required' });
    }

    const [male, female, gift] = await Promise.all([
      MaleUser.findById(req.user.id),
      FemaleUser.findById(femaleUserId),
      Gift.findById(giftId)
    ]);

    if (!male) return res.status(404).json({ success: false, message: messages.COMMON.MALE_USER_NOT_FOUND });
    if (!female) return res.status(404).json({ success: false, message: messages.COMMON.FEMALE_USER_NOT_FOUND });
    if (!gift || gift.status !== 'publish') {
      return res.status(400).json({ success: false, message: 'Invalid gift' });
    }

    const cost = gift.coin || 0;
    if ((male.coinBalance || 0) < cost) {
      return res.status(400).json({ success: false, message: 'You do not have enough coins to gift.' });
    }

    // Adjust balances
    // Deduct coins from male user's coinBalance
    male.coinBalance = (male.coinBalance || 0) - cost;
    
    // Add real money equivalent to female user's walletBalance
    female.walletBalance = (female.walletBalance || 0) + cost;

    await male.save();
    await female.save();

    // Record transactions for both users
    await Transaction.create({
      userType: 'male',
      userId: male._id,
      operationType: 'coin',
      action: 'debit',
      amount: cost,
      message: `Gift sent (${gift.giftTitle || 'gift'}) to ${female.email}`,
      balanceAfter: male.coinBalance,
      createdBy: male._id
    });
    
    await Transaction.create({
      userType: 'female',
      userId: female._id,
      operationType: 'wallet',
      action: 'credit',
      amount: cost,
      earningType: 'gift',
      message: `Gift received (${gift.giftTitle || 'gift'}) from ${male.email}`,
      balanceAfter: female.walletBalance,
      createdBy: male._id
    });

    // Save gift received record
    await GiftReceived.create({
      senderId: male._id,
      receiverId: female._id,
      giftId: gift._id,
      giftTitle: gift.giftTitle,
      coinsSpent: cost,
      message: `Gift received (${gift.giftTitle || 'gift'}) from ${male.firstName} ${male.lastName || ''}`
    });

    return res.json({ 
      success: true, 
      message: 'Gift sent successfully.', 
      data: { 
        maleCoinBalance: male.coinBalance, 
        femaleWalletBalance: female.walletBalance 
      } 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};