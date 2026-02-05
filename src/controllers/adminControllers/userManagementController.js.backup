const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const getUserId = require('../../utils/getUserId');
const Transaction = require('../../models/common/Transaction');
const AgencyUser = require('../../models/agency/AgencyUser');
const mongoose = require('mongoose');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const AdminLevelConfig = require('../../models/admin/AdminLevelConfig');
const messages = require('../../validations/messages');
const notificationService = require('../../services/notificationService');
const notificationEvents = require('../../constants/notificationEvents');

// Utility function to clean up invalid interests and languages references for a user
const cleanUpUserReferences = async (userId) => {
	try {
		const FemaleUser = require('../../models/femaleUser/FemaleUser');
		const Interest = require('../../models/admin/Interest');
		const Language = require('../../models/admin/Language');
		
		const user = await FemaleUser.findById(userId);
		if (!user) return null;
		
		let updateNeeded = false;
		let updatedInterests = [];
		let updatedLanguages = [];
		
		// Check and clean up interests
		if (user.interests && user.interests.length > 0) {
			const validInterests = await Interest.find({ 
				_id: { $in: user.interests } 
			});
			updatedInterests = validInterests.map(i => i._id);
			if (updatedInterests.length !== user.interests.length) {
				updateNeeded = true;
			}
		}
		
		// Check and clean up languages
		if (user.languages && user.languages.length > 0) {
			const validLanguages = await Language.find({ 
				_id: { $in: user.languages } 
			});
			updatedLanguages = validLanguages.map(l => l._id);
			if (updatedLanguages.length !== user.languages.length) {
				updateNeeded = true;
			}
		}
		
		// Update user if there are invalid references
		if (updateNeeded) {
			await FemaleUser.findByIdAndUpdate(userId, {
				interests: updatedInterests,
				languages: updatedLanguages
			});
			console.log(`Cleaned up references for user ${userId}`);
		}
		
		return {
			originalInterestsCount: user.interests ? user.interests.length : 0,
			validInterestsCount: updatedInterests.length,
			originalLanguagesCount: user.languages ? user.languages.length : 0,
			validLanguagesCount: updatedLanguages.length,
			cleaned: updateNeeded
		};
	} catch (error) {
		console.error('Error cleaning up user references:', error);
		return null;
	}
};

// Clean up user references (admin endpoint)
exports.cleanUserReferences = async (req, res) => {
	try {
		const { userId } = req.params;
		const result = await cleanUpUserReferences(userId);
		
		if (!result) {
			return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
		}
		
		return res.json({ 
			success: true, 
			message: messages.USER_MANAGEMENT.USER_REFERENCES_CLEANED,
			data: result 
		});
	} catch (err) {
		return res.status(500).json({ success: false, error: err.message });
	}
};

// List users
exports.listUsers = async (req, res) => {
  try {
    const { type } = req.query;
    let data;

    /* ================== MALE ================== */
    if (type === 'male') {
      data = await MaleUser.find()
        .select('-searchPreferences -balance')
        .populate({ path: 'images', select: 'maleUserId imageUrl createdAt updatedAt' })
        .populate({ path: 'interests', select: 'title _id' })
        .populate({ path: 'languages', select: 'title _id' })
        .populate({ path: 'relationshipGoals', select: 'title _id' })
        .populate({ path: 'religion', select: 'title _id' })
        .populate({ path: 'favourites', select: 'name email' })

        // join → female user
        .populate({
          path: 'malefollowing',
          populate: { path: 'femaleUserId', select: 'name' }
        })
        .populate({
          path: 'malefollowers',
          populate: { path: 'femaleUserId', select: 'name' }
        })

        // referred by (male)
        .populate({
          path: 'referredBy',
          select: 'firstName lastName'
        });

      // map to {id, name}
      data = data.map(u => {
        const obj = u.toObject();

        const mapFemale = arr =>
          arr
            ?.filter(f => f.femaleUserId)
            .map(f => ({
              id: f.femaleUserId._id,
              name: f.femaleUserId.name
            })) || [];

        const mapReferred = arr =>
          arr?.map(r => ({
            id: r._id,
            name: `${r.firstName} ${r.lastName || ''}`.trim()
          })) || [];

        return {
          ...obj,
          malefollowing: mapFemale(obj.malefollowing),
          malefollowers: mapFemale(obj.malefollowers),
          referredBy: mapReferred(obj.referredBy)
        };
      });

      return res.json({ success: true, data });
    }

    /* ================== FEMALE ================== */
    if (type === 'female') {
      data = await FemaleUser.find()
        .select('name email score earnings totalOnlineMinutes images')
        .populate({ path: 'images', select: 'femaleUserId imageUrl createdAt updatedAt' })
        .populate({ path: 'interests', select: 'title _id' })
        .populate({ path: 'languages', select: 'title _id' });

      return res.json({ success: true, data });
    }

    /* ================== AGENCY ================== */
    if (type === 'agency') {
      data = await AgencyUser.find()
        .populate({ path: 'referredByAgency', select: 'firstName lastName email' });

      return res.json({ success: true, data });
    }

    return res.json({ success: true, data: [] });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};



// Toggle status active/inactive
exports.toggleStatus = async (req, res) => {
	try {
		const { userType, userId, status } = req.body; // userType: 'male' | 'female' | 'agency'; status: 'active' | 'inactive'
		if (!['male', 'female', 'agency'].includes(userType)) {
			return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_USER_TYPE });
		}
		if (!['active', 'inactive'].includes(status)) {
			return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_STATUS });
		}
		let Model;
		if (userType === 'male') {
			Model = MaleUser;
		} else if (userType === 'female') {
			Model = FemaleUser;
		} else if (userType === 'agency') {
			Model = AgencyUser;
		}
		const user = await Model.findByIdAndUpdate(userId, { status }, { new: true });
		if (!user) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
		return res.json({ success: true, data: user });
	} catch (err) {
		return res.status(500).json({ success: false, error: err.message });
	}
};

// Wallet/Coin operation (credit/debit) for specific user
exports.operateBalance = async (req, res) => {
    try {
        const { userType, userId, operationType, action, amount, message } = req.body;
        if (!['male', 'female', 'agency'].includes(userType)) return res.status(400).json({ success: false, message: 'Invalid userType' });
        if (!['wallet', 'coin'].includes(operationType)) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_OPERATION_TYPE });
        if (!['credit', 'debit'].includes(action)) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_ACTION });
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_AMOUNT });

        let Model;
        if (userType === 'male') {
            Model = MaleUser;
        } else if (userType === 'female') {
            Model = FemaleUser;
        } else if (userType === 'agency') {
            Model = AgencyUser;
        }
        
        const user = await Model.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });

        const balanceField = operationType === 'wallet' ? 'walletBalance' : 'coinBalance';
        const currentBalance = user[balanceField] || 0;
        const updatedBalance = action === 'credit' ? currentBalance + numericAmount : currentBalance - numericAmount;
        if (updatedBalance < 0) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INSUFFICIENT_BALANCE });

        user[balanceField] = updatedBalance;
        await user.save();

        const txn = await Transaction.create({
            userType,
            userId: user._id,
            operationType,
            action,
            amount: numericAmount,
            message: message || (action === 'credit' ? messages.USER_MANAGEMENT.BALANCE_CREDITED : messages.USER_MANAGEMENT.BALANCE_DEBITED),
            balanceAfter: updatedBalance,
            createdBy: req.admin?._id || req.staff?._id
        });

        return res.json({ success: true, data: { userId: user._id, [balanceField]: updatedBalance, transaction: txn } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Approve/Reject registration for female or agency
exports.reviewRegistration = async (req, res) => {
    try {
        const { userType, userId, reviewStatus } = req.body; // userType: 'female' | 'agency'; reviewStatus: 'accepted' | 'rejected'
        if (!['female', 'agency'].includes(userType)) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_USER_TYPE });
        if (!['accepted', 'rejected'].includes(reviewStatus)) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_REVIEW_STATUS });
        
        const Model = userType === 'female' ? FemaleUser : AgencyUser;
        
        // Get the user before update to check old review status
        const userBeforeUpdate = await Model.findById(userId);
        if (!userBeforeUpdate) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
        
        const oldReviewStatus = userBeforeUpdate.reviewStatus;
        
        // Update the review status
        const user = await Model.findByIdAndUpdate(userId, { reviewStatus }, { new: true });
        
        // Trigger referral bonus if status changed to "accepted" from a non-accepted status
        if (reviewStatus === 'accepted' && oldReviewStatus !== 'accepted') {
            
            if (userType === 'female') {
                // Process referral bonus for female user
                const processReferralBonus = require('../../utils/processReferralBonus');
                await processReferralBonus(user, 'female');
            }
            
            if (userType === 'agency') {
                // Process referral bonus for agency user
                const processReferralBonus = require('../../utils/processReferralBonus');
                await processReferralBonus(user, 'agency');
            }
        }
        
        return res.json({ success: true, data: user });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Update KYC status by admin (alternative to updating individual KYC records)
exports.updateKYCStatus = async (req, res) => {
    try {
        const { userId, userType, kycStatus } = req.body;
        // userType = 'female' | 'agency'
        // kycStatus = 'accepted' | 'rejected'

        if (!['female', 'agency'].includes(userType)) {
            return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_USER_TYPE });
        }
        
        if (!['accepted', 'rejected'].includes(kycStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid KYC status' });
        }
        
        let Model;
        if (userType === 'female') {
            Model = FemaleUser;
        } else {
            Model = AgencyUser;
        }
        
        const user = await Model.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
        }

        if (user.kycStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'KYC is not under review'
            });
        }

        // Update overall kycStatus and ensure at least one method is updated
        user.kycStatus = kycStatus;
        
        // If overall status is being set to accepted/rejected, ensure at least one method reflects this
        if (kycStatus === 'accepted' && user.kycDetails) {
            // Mark any pending methods as accepted
            if (user.kycDetails.bank && user.kycDetails.bank.status === 'pending') {
                user.kycDetails.bank.status = 'accepted';
                if (!user.kycDetails.bank.verifiedAt) {
                    user.kycDetails.bank.verifiedAt = new Date();
                }
            }
            if (user.kycDetails.upi && user.kycDetails.upi.status === 'pending') {
                user.kycDetails.upi.status = 'accepted';
                if (!user.kycDetails.upi.verifiedAt) {
                    user.kycDetails.upi.verifiedAt = new Date();
                }
            }
        } else if (kycStatus === 'rejected' && user.kycDetails) {
            // Mark any pending methods as rejected
            if (user.kycDetails.bank && user.kycDetails.bank.status === 'pending') {
                user.kycDetails.bank.status = 'rejected';
            }
            if (user.kycDetails.upi && user.kycDetails.upi.status === 'pending') {
                user.kycDetails.upi.status = 'rejected';
            }
            
            // Check if any other method is still accepted, otherwise set overall to rejected
            const hasAcceptedMethod = 
                (user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') ||
                (user.kycDetails.upi && user.kycDetails.upi.status === 'accepted');
            
            if (!hasAcceptedMethod) {
                user.kycStatus = 'rejected';
            } else {
                // If there are still accepted methods, don't set overall to rejected
                user.kycStatus = 'accepted';
            }
        }
        
        await user.save();

        return res.json({ success: true, data: user });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Approve/Reject KYC by admin/staff
exports.reviewKYC = async (req, res) => {
    try {
        const { kycId, status, kycType, rejectionReason } = req.body; // status: 'approved' | 'rejected', kycType: 'female' | 'agency'
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_STATUS });
        if (!['female', 'agency'].includes(kycType)) return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_USER_KYC_TYPE });
        
        let kyc;
        if (kycType === 'female') {
            const FemaleKYC = require('../../models/femaleUser/KYC');
            kyc = await FemaleKYC.findByIdAndUpdate(kycId, { status, verifiedBy: req.admin?._id || req.staff?._id }, { new: true });
            if (!kyc) return res.status(404).json({ success: false, message: messages.USER_MANAGEMENT.FEMALE_KYC_NOT_FOUND });
            // Update FemaleUser kycStatus and kycDetails when KYC is approved (status = 'accepted')
            if (status === 'approved') {
                // Update only the specific method that was approved
                const user = await FemaleUser.findById(kyc.user);
                
                // Initialize kycDetails with new structure if it doesn't exist or has old structure
                if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
                    user.kycDetails = {
                        bank: {},
                        upi: {}
                    };
                }
                
                const mongoose = require('mongoose');
                
                if (kyc.method === 'account_details' && kyc.accountDetails) {
                    // Update bank details with status and verified timestamp
                    user.kycDetails.bank = {
                        _id: user.kycDetails.bank._id || new mongoose.Types.ObjectId(),
                        name: kyc.accountDetails.name,
                        accountNumber: kyc.accountDetails.accountNumber,
                        ifsc: kyc.accountDetails.ifsc,
                        status: 'accepted',
                        verifiedAt: new Date()
                    };
                } else if (kyc.method === 'upi_id' && kyc.upiId) {
                    // Update UPI details with status and verified timestamp
                    user.kycDetails.upi = {
                        _id: user.kycDetails.upi._id || new mongoose.Types.ObjectId(),
                        upiId: kyc.upiId,
                        status: 'accepted',
                        verifiedAt: new Date()
                    };
                }
                
                // Set overall KYC status to accepted
                user.kycStatus = 'accepted';
                await user.save();
                
                // Send notification to female user about KYC approval
                console.log('=== SENDING KYC APPROVAL NOTIFICATION ===');
                console.log('User ID:', user._id.toString());
                console.log('User Type:', 'female');
                console.log('Processed By:', req.admin?._id || req.staff?._id);
                
                try {
                    const notificationResult = await notificationService.handleEvent(
                        notificationEvents.KYC_APPROVED,
                        {
                            userId: user._id.toString(),
                            userType: 'female',
                            processedBy: req.admin?._id || req.staff?._id,
                            status: 'approved'
                        }
                    );
                    
                    console.log('✅ Notification result:', notificationResult);
                } catch (notificationError) {
                    console.error('❌ Error sending notification:', notificationError);
                    console.error('Error stack:', notificationError.stack);
                }
            } else if (status === 'rejected') {
                // Update the specific method that was rejected
                const user = await FemaleUser.findById(kyc.user);
                
                // Initialize kycDetails with new structure if it doesn't exist or has old structure
                if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
                    user.kycDetails = {
                        bank: {},
                        upi: {}
                    };
                }
                
                if (kyc.method === 'account_details' && kyc.accountDetails) {
                    // Update bank details with rejected status
                    user.kycDetails.bank = {
                        _id: user.kycDetails.bank._id || new mongoose.Types.ObjectId(),
                        name: kyc.accountDetails.name,
                        accountNumber: kyc.accountDetails.accountNumber,
                        ifsc: kyc.accountDetails.ifsc,
                        status: 'rejected',
                        verifiedAt: user.kycDetails.bank.verifiedAt // Keep original verifiedAt if it existed
                    };
                } else if (kyc.method === 'upi_id' && kyc.upiId) {
                    // Update UPI details with rejected status
                    user.kycDetails.upi = {
                        _id: user.kycDetails.upi._id || new mongoose.Types.ObjectId(),
                        upiId: kyc.upiId,
                        status: 'rejected',
                        verifiedAt: user.kycDetails.upi.verifiedAt // Keep original verifiedAt if it existed
                    };
                }
                
                // Check if any other method is still accepted, otherwise set to rejected
                const hasAcceptedMethod = 
                    (user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') ||
                    (user.kycDetails.upi && user.kycDetails.upi.status === 'accepted');
                
                if (!hasAcceptedMethod) {
                    user.kycStatus = 'rejected';
                }
                
                await user.save();
                
                // Send notification to female user about KYC rejection
                notificationService.handleEvent(
                    notificationEvents.KYC_REJECTED,
                    {
                        userId: user._id.toString(),
                        userType: 'female',
                        processedBy: req.admin?._id || req.staff?._id,
                        status: 'rejected'
                    }
                );
            }
        } else {
            const AgencyKYC = require('../../models/agency/KYC');
            kyc = await AgencyKYC.findByIdAndUpdate(kycId, { status, verifiedBy: req.admin?._id || req.staff?._id }, { new: true });
            if (!kyc) return res.status(404).json({ success: false, message: messages.USER_MANAGEMENT.AGENCY_KYC_NOT_FOUND });
            // Update AgencyUser kycStatus and kycDetails when KYC is approved (status = 'accepted')
            if (status === 'approved') {
                const user = await AgencyUser.findById(kyc.user);
                
                // Initialize kycDetails with new structure if it doesn't exist or has old structure
                if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
                    user.kycDetails = {
                        bank: {},
                        upi: {}
                    };
                }
                
                if (kyc.method === 'account_details' && kyc.accountDetails) {
                    // Update bank details with status and verified timestamp
                    user.kycDetails.bank = {
                        _id: user.kycDetails.bank._id || new mongoose.Types.ObjectId(),
                        name: kyc.accountDetails.name,
                        accountNumber: kyc.accountDetails.accountNumber,
                        ifsc: kyc.accountDetails.ifsc,
                        status: 'accepted',
                        verifiedAt: new Date()
                    };
                } else if (kyc.method === 'upi_id' && kyc.upiId) {
                    // Update UPI details with status and verified timestamp
                    user.kycDetails.upi = {
                        _id: user.kycDetails.upi._id || new mongoose.Types.ObjectId(),
                        upiId: kyc.upiId,
                        status: 'accepted',
                        verifiedAt: new Date()
                    };
                }
                
                // Set overall KYC status to accepted
                user.kycStatus = 'accepted';
                await user.save();
                
                // Send notification to agency user about KYC approval
                notificationService.handleEvent(
                    notificationEvents.KYC_APPROVED,
                    {
                        userId: user._id.toString(),
                        userType: 'agency',
                        processedBy: req.admin?._id || req.staff?._id,
                        status: 'approved'
                    }
                );
            } else if (status === 'rejected') {
                // Update the specific method that was rejected
                const user = await AgencyUser.findById(kyc.user);
                
                // Initialize kycDetails with new structure if it doesn't exist or has old structure
                if (!user.kycDetails || !user.kycDetails.bank || !user.kycDetails.upi) {
                    user.kycDetails = {
                        bank: {},
                        upi: {}
                    };
                }
                
                if (kyc.method === 'account_details' && kyc.accountDetails) {
                    // Update bank details with rejected status
                    user.kycDetails.bank = {
                        _id: user.kycDetails.bank._id || new mongoose.Types.ObjectId(),
                        name: kyc.accountDetails.name,
                        accountNumber: kyc.accountDetails.accountNumber,
                        ifsc: kyc.accountDetails.ifsc,
                        status: 'rejected',
                        verifiedAt: user.kycDetails.bank.verifiedAt // Keep original verifiedAt if it existed
                    };
                } else if (kyc.method === 'upi_id' && kyc.upiId) {
                    // Update UPI details with rejected status
                    user.kycDetails.upi = {
                        _id: user.kycDetails.upi._id || new mongoose.Types.ObjectId(),
                        upiId: kyc.upiId,
                        status: 'rejected',
                        verifiedAt: user.kycDetails.upi.verifiedAt // Keep original verifiedAt if it existed
                    };
                }
                
                // Check if any other method is still accepted, otherwise set to rejected
                const hasAcceptedMethod = 
                    (user.kycDetails.bank && user.kycDetails.bank.status === 'accepted') ||
                    (user.kycDetails.upi && user.kycDetails.upi.status === 'accepted');
                
                if (!hasAcceptedMethod) {
                    user.kycStatus = 'rejected';
                }
                
                await user.save();
                
                // Send notification to agency user about KYC rejection
                notificationService.handleEvent(
                    notificationEvents.KYC_REJECTED,
                    {
                        userId: user._id.toString(),
                        userType: 'agency',
                        processedBy: req.admin?._id || req.staff?._id,
                        status: 'rejected'
                    }
                );
            }
        }
        
        return res.json({ success: true, data: kyc });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// List pending registrations (female/agency) for admin review
exports.listPendingRegistrations = async (req, res) => {
    try {
        const { userType } = req.query; // 'female' | 'agency' | undefined (all)
        let data = {};
        if (!userType || userType === 'female') {
            data.females = await FemaleUser.find({ reviewStatus: 'pending' }).select('-otp -passwordHash');
        }
        if (!userType || userType === 'agency') {
            data.agencies = await AgencyUser.find({ reviewStatus: 'pending' }).select('-otp');
        }
        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// List pending KYCs for admin review
exports.listPendingKYCs = async (req, res) => {
    try {
        const FemaleKYC = require('../../models/femaleUser/KYC');
        const AgencyKYC = require('../../models/agency/KYC');
        
        const [femaleKycs, agencyKycs] = await Promise.all([
            FemaleKYC.find({ status: 'pending' }).populate('user', 'name email mobileNumber'),
            AgencyKYC.find({ status: 'pending' }).populate('user', 'firstName lastName email mobileNumber')
        ]);
        
        return res.json({ success: true, data: { femaleKycs, agencyKycs } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
// List transactions for a user with optional date filters
exports.listTransactions = async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const { operationType, startDate, endDate } = req.query;
        if (!['male', 'female'].includes(userType)) return res.status(400).json({ success: false, message: 'Invalid userType' });

        const filter = { userType, userId };
        if (operationType && ['wallet', 'coin'].includes(operationType)) {
            filter.operationType = operationType;
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const inclusiveEnd = new Date(endDate);
                inclusiveEnd.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = inclusiveEnd;
            }
        }

        const txns = await Transaction.find(filter).sort({ createdAt: -1 });
        return res.json({ success: true, data: txns });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Delete user by admin (for testing purposes)
exports.deleteUser = async (req, res) => {
    try {
        const { userType, userId } = req.params; // userType: 'male' | 'female' | 'agency'
        if (!['male', 'female', 'agency'].includes(userType)) {
            return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.INVALID_USER_TYPE });
        }

        let Model;
        if (userType === 'male') {
            Model = MaleUser;
        } else if (userType === 'female') {
            Model = FemaleUser;
        } else {
            Model = AgencyUser;
        }

        const user = await Model.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
        }

        return res.json({ 
            success: true, 
            message: messages.USER_MANAGEMENT.USER_DELETED_SUCCESS(userType),
            deletedUser: { id: user._id, email: user.email }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Set coins per second rate for female user
exports.setFemaleCallRate = async (req, res) => {
    try {
        const { userId, coinsPerSecond } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.USER_ID_REQUIRED });
        }
        
        if (coinsPerSecond === undefined || coinsPerSecond === null) {
            return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.COINS_PER_SECOND_REQUIRED });
        }
        
        const numericRate = Number(coinsPerSecond);
        if (!Number.isFinite(numericRate) || numericRate < 0) {
            return res.status(400).json({ 
                success: false, 
                message: messages.USER_MANAGEMENT.COINS_PER_SECOND_INVALID 
            });
        }
        
        const femaleUser = await FemaleUser.findByIdAndUpdate(
            userId,
            { coinsPerSecond: numericRate },
            { new: true }
        ).select('name email coinsPerSecond');
        
        if (!femaleUser) {
            return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
        }
        
        return res.json({
            success: true,
            message: messages.USER_MANAGEMENT.CALL_RATE_UPDATED(femaleUser.name, femaleUser.email),
            data: {
                userId: femaleUser._id,
                name: femaleUser.name,
                email: femaleUser.email,
                coinsPerSecond: femaleUser.coinsPerSecond
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Create or update level configuration
exports.createUpdateLevelConfig = async (req, res) => {
  try {
    const {
      level,
      weeklyEarningsMin,
      weeklyEarningsMax,
      audioRateRange,
      videoRateRange,
      audioRatePerMinute,
      videoRatePerMinute,
      platformMarginPerMinute,
      isActive
    } = req.body;
    
    // Check if using new schema (fixed rates) or old schema (ranges)
    if (!level || weeklyEarningsMin === undefined || weeklyEarningsMax === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: level, weeklyEarningsMin, weeklyEarningsMax'
      });
    }
    
    // Validate numeric values for required fields
    if (isNaN(level) || isNaN(weeklyEarningsMin) || isNaN(weeklyEarningsMax)) {
      return res.status(400).json({
        success: false,
        message: 'Required values (level, weeklyEarningsMin, weeklyEarningsMax) must be numbers'
      });
    }
    
    // Validate ranges for required fields
    if (level < 0) {
      return res.status(400).json({
        success: false,
        message: 'Level must be a valid non-negative number (0 or greater)'
      });
    }
    
    if (weeklyEarningsMin < 0 || weeklyEarningsMax < 0 || weeklyEarningsMin > weeklyEarningsMax) {
      return res.status(400).json({
        success: false,
        message: 'Invalid weekly earnings range'
      });
    }
    
    // Determine which schema to use
    let configData;
    if (audioRatePerMinute !== undefined && videoRatePerMinute !== undefined && platformMarginPerMinute) {
      // New schema with fixed rates
      if (isNaN(audioRatePerMinute) || isNaN(videoRatePerMinute)) {
        return res.status(400).json({
          success: false,
          message: 'audioRatePerMinute and videoRatePerMinute must be numbers'
        });
      }
      
      if (audioRatePerMinute < 0 || videoRatePerMinute < 0) {
        return res.status(400).json({
          success: false,
          message: 'audioRatePerMinute and videoRatePerMinute must be non-negative numbers'
        });
      }
      
      // Validate platformMarginPerMinute structure
      if (typeof platformMarginPerMinute !== 'object' || 
          platformMarginPerMinute.nonAgency === undefined || 
          platformMarginPerMinute.agency === undefined) {
        return res.status(400).json({
          success: false,
          message: 'platformMarginPerMinute must be an object with nonAgency and agency properties'
        });
      }
      
      if (isNaN(platformMarginPerMinute.nonAgency) || isNaN(platformMarginPerMinute.agency)) {
        return res.status(400).json({
          success: false,
          message: 'platformMarginPerMinute values must be numbers'
        });
      }
      
      if (platformMarginPerMinute.nonAgency < 0 || platformMarginPerMinute.agency < 0) {
        return res.status(400).json({
          success: false,
          message: 'platformMarginPerMinute values must be non-negative numbers'
        });
      }
      
      configData = {
        level: Number(level),
        weeklyEarningsMin: Number(weeklyEarningsMin),
        weeklyEarningsMax: Number(weeklyEarningsMax),
        audioRatePerMinute: Number(audioRatePerMinute),
        videoRatePerMinute: Number(videoRatePerMinute),
        platformMarginPerMinute: {
          nonAgency: Number(platformMarginPerMinute.nonAgency),
          agency: Number(platformMarginPerMinute.agency)
        },
        isActive: isActive !== undefined ? isActive : true
      };
    } else if (audioRateRange && audioRateRange.min !== undefined && audioRateRange.max !== undefined &&
               videoRateRange && videoRateRange.min !== undefined && videoRateRange.max !== undefined) {
      // Old schema with ranges
      if (isNaN(audioRateRange.min) || isNaN(audioRateRange.max) ||
          isNaN(videoRateRange.min) || isNaN(videoRateRange.max)) {
        return res.status(400).json({
          success: false,
          message: 'All rate range values must be numbers'
        });
      }
      
      if (audioRateRange.min < 0 || audioRateRange.max < 0 || audioRateRange.min > audioRateRange.max ||
          videoRateRange.min < 0 || videoRateRange.max < 0 || videoRateRange.min > videoRateRange.max) {
        return res.status(400).json({
          success: false,
          message: 'Invalid rate ranges'
        });
      }
      
      configData = {
        level: Number(level),
        weeklyEarningsMin: Number(weeklyEarningsMin),
        weeklyEarningsMax: Number(weeklyEarningsMax),
        audioRateRange: {
          min: Number(audioRateRange.min),
          max: Number(audioRateRange.max)
        },
        videoRateRange: {
          min: Number(videoRateRange.min),
          max: Number(videoRateRange.max)
        },
        isActive: isActive !== undefined ? isActive : true
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either provide audioRatePerMinute and videoRatePerMinute with platformMarginPerMinute (new schema) or audioRateRange and videoRateRange with min/max (old schema)'
      });
    }
    
    const config = await AdminLevelConfig.findOneAndUpdate(
      { level },
      configData,
      { upsert: true, new: true }
    );
    
    return res.json({
      success: true,
      message: `Level configuration ${config.isNew ? 'created' : 'updated'} successfully`,
      data: config
    });
  } catch (err) {
    console.error('Error in createUpdateLevelConfig:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get all level configurations
exports.getAllLevelConfigs = async (req, res) => {
  try {
    const configs = await AdminLevelConfig.find().sort({ level: 1 });
    
    return res.json({
      success: true,
      data: configs
    });
  } catch (err) {
    console.error('Error in getAllLevelConfigs:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Delete level configuration
exports.deleteLevelConfig = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required'
      });
    }
    
    const config = await AdminLevelConfig.findByIdAndDelete(id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Level configuration not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Level configuration deleted successfully',
      data: config
    });
  } catch (err) {
    console.error('Error in deleteLevelConfig:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update specific level configuration
exports.updateLevelConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      level,
      weeklyEarningsMin,
      weeklyEarningsMax,
      audioRateRange,
      videoRateRange,
      audioRatePerMinute,
      videoRatePerMinute,
      platformMarginPerMinute,
      isActive
    } = req.body;
    
    // Validate required fields
    if (id === undefined || id === null) {
      return res.status(400).json({
        success: false,
        message: 'ID parameter is required'
      });
    }
    
    // Build update object with only provided fields
    const updateData = {};
    
    if (level !== undefined) {
      updateData.level = Number(level);
    }
    if (weeklyEarningsMin !== undefined) {
      updateData.weeklyEarningsMin = Number(weeklyEarningsMin);
    }
    if (weeklyEarningsMax !== undefined) {
      updateData.weeklyEarningsMax = Number(weeklyEarningsMax);
    }
    if (audioRatePerMinute !== undefined) {
      updateData.audioRatePerMinute = Number(audioRatePerMinute);
    }
    if (videoRatePerMinute !== undefined) {
      updateData.videoRatePerMinute = Number(videoRatePerMinute);
    }
    if (platformMarginPerMinute !== undefined) {
      if (typeof platformMarginPerMinute === 'object') {
        if (platformMarginPerMinute.nonAgency !== undefined) {
          updateData['platformMarginPerMinute.nonAgency'] = Number(platformMarginPerMinute.nonAgency);
        }
        if (platformMarginPerMinute.agency !== undefined) {
          updateData['platformMarginPerMinute.agency'] = Number(platformMarginPerMinute.agency);
        }
      }
    }
    if (audioRateRange !== undefined) {
      if (audioRateRange.min !== undefined) {
        updateData['audioRateRange.min'] = Number(audioRateRange.min);
      }
      if (audioRateRange.max !== undefined) {
        updateData['audioRateRange.max'] = Number(audioRateRange.max);
      }
    }
    if (videoRateRange !== undefined) {
      if (videoRateRange.min !== undefined) {
        updateData['videoRateRange.min'] = Number(videoRateRange.min);
      }
      if (videoRateRange.max !== undefined) {
        updateData['videoRateRange.max'] = Number(videoRateRange.max);
      }
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    // Validate numeric values if provided
    if (updateData.level !== undefined && (isNaN(updateData.level) || updateData.level < 0)) {
      return res.status(400).json({
        success: false,
        message: 'level must be a valid non-negative number (0 or greater)'
      });
    }
    
    if (updateData.weeklyEarningsMin !== undefined && (isNaN(updateData.weeklyEarningsMin) || updateData.weeklyEarningsMin < 0)) {
      return res.status(400).json({
        success: false,
        message: 'weeklyEarningsMin must be a valid non-negative number'
      });
    }
    
    if (updateData.weeklyEarningsMax !== undefined && (isNaN(updateData.weeklyEarningsMax) || updateData.weeklyEarningsMax < 0)) {
      return res.status(400).json({
        success: false,
        message: 'weeklyEarningsMax must be a valid non-negative number'
      });
    }
    
    if (updateData.audioRatePerMinute !== undefined && (isNaN(updateData.audioRatePerMinute) || updateData.audioRatePerMinute < 0)) {
      return res.status(400).json({
        success: false,
        message: 'audioRatePerMinute must be a valid non-negative number'
      });
    }
    
    if (updateData.videoRatePerMinute !== undefined && (isNaN(updateData.videoRatePerMinute) || updateData.videoRatePerMinute < 0)) {
      return res.status(400).json({
        success: false,
        message: 'videoRatePerMinute must be a valid non-negative number'
      });
    }
    
    if (updateData['platformMarginPerMinute.nonAgency'] !== undefined && (isNaN(updateData['platformMarginPerMinute.nonAgency']) || updateData['platformMarginPerMinute.nonAgency'] < 0)) {
      return res.status(400).json({
        success: false,
        message: 'platformMarginPerMinute.nonAgency must be a valid non-negative number'
      });
    }
    
    if (updateData['platformMarginPerMinute.agency'] !== undefined && (isNaN(updateData['platformMarginPerMinute.agency']) || updateData['platformMarginPerMinute.agency'] < 0)) {
      return res.status(400).json({
        success: false,
        message: 'platformMarginPerMinute.agency must be a valid non-negative number'
      });
    }
    
    if (updateData['audioRateRange.min'] !== undefined && (isNaN(updateData['audioRateRange.min']) || updateData['audioRateRange.min'] < 0)) {
      return res.status(400).json({
        success: false,
        message: 'audioRateRange.min must be a valid non-negative number'
      });
    }
    
    if (updateData['audioRateRange.max'] !== undefined && (isNaN(updateData['audioRateRange.max']) || updateData['audioRateRange.max'] < 0)) {
      return res.status(400).json({
        success: false,
        message: 'audioRateRange.max must be a valid non-negative number'
      });
    }
    
    if (updateData['videoRateRange.min'] !== undefined && (isNaN(updateData['videoRateRange.min']) || updateData['videoRateRange.min'] < 0)) {
      return res.status(400).json({
        success: false,
        message: 'videoRateRange.min must be a valid non-negative number'
      });
    }
    
    if (updateData['videoRateRange.max'] !== undefined && (isNaN(updateData['videoRateRange.max']) || updateData['videoRateRange.max'] < 0)) {
      return res.status(400).json({
        success: false,
        message: 'videoRateRange.max must be a valid non-negative number'
      });
    }
    
    // Validate ranges if both min and max are provided
    if (updateData.weeklyEarningsMin !== undefined && updateData.weeklyEarningsMax !== undefined && 
        updateData.weeklyEarningsMin > updateData.weeklyEarningsMax) {
      return res.status(400).json({
        success: false,
        message: 'weeklyEarningsMin cannot be greater than weeklyEarningsMax'
      });
    }
    
    if (updateData['audioRateRange.min'] !== undefined && updateData['audioRateRange.max'] !== undefined &&
        updateData['audioRateRange.min'] > updateData['audioRateRange.max']) {
      return res.status(400).json({
        success: false,
        message: 'audioRateRange.min cannot be greater than audioRateRange.max'
      });
    }
    
    if (updateData['videoRateRange.min'] !== undefined && updateData['videoRateRange.max'] !== undefined &&
        updateData['videoRateRange.min'] > updateData['videoRateRange.max']) {
      return res.status(400).json({
        success: false,
        message: 'videoRateRange.min cannot be greater than videoRateRange.max'
      });
    }    
    const config = await AdminLevelConfig.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Level configuration not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Level configuration updated successfully',
      data: config
    });
  } catch (err) {
    console.error('Error in updateLevelConfig:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update female user call rates (new method for level-based system)
exports.setFemaleCallRates = async (req, res) => {
  try {
    const { userId, audioCoinsPerMinute, videoCoinsPerMinute } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: messages.USER_MANAGEMENT.USER_ID_REQUIRED });
    }
    
    // Get user to validate existence and get level
    const femaleUser = await FemaleUser.findById(userId);
    if (!femaleUser) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    // Get level configuration to validate rates
    const levelConfig = await AdminLevelConfig.findOne({ 
      level: femaleUser.currentLevel, 
      isActive: true 
    });
    
    if (!levelConfig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Level configuration not found for user level' 
      });
    }
    
    // Validate audio rate if provided
    if (audioCoinsPerMinute !== undefined) {
      const rate = Number(audioCoinsPerMinute);
      
      // Check if using new schema (fixed rates) or old schema (ranges)
      if (levelConfig.audioRatePerMinute !== undefined) {
        // New schema: check against fixed rate
        if (isNaN(rate) || rate !== levelConfig.audioRatePerMinute) {
          return res.status(400).json({ 
            success: false, 
            message: `Audio rate must match the fixed rate of ${levelConfig.audioRatePerMinute} coins per minute for level ${levelConfig.level}` 
          });
        }
      } else {
        // Old schema: check against range
        if (isNaN(rate) || rate < levelConfig.audioRateRange.min || rate > levelConfig.audioRateRange.max) {
          return res.status(400).json({ 
            success: false, 
            message: `Audio rate must be between ${levelConfig.audioRateRange.min} and ${levelConfig.audioRateRange.max} coins per minute` 
          });
        }
      }
      femaleUser.audioCoinsPerMinute = rate;
    }
    
    // Validate video rate if provided
    if (videoCoinsPerMinute !== undefined) {
      const rate = Number(videoCoinsPerMinute);
      
      // Check if using new schema (fixed rates) or old schema (ranges)
      if (levelConfig.videoRatePerMinute !== undefined) {
        // New schema: check against fixed rate
        if (isNaN(rate) || rate !== levelConfig.videoRatePerMinute) {
          return res.status(400).json({ 
            success: false, 
            message: `Video rate must match the fixed rate of ${levelConfig.videoRatePerMinute} coins per minute for level ${levelConfig.level}` 
          });
        }
      } else {
        // Old schema: check against range
        if (isNaN(rate) || rate < levelConfig.videoRateRange.min || rate > levelConfig.videoRateRange.max) {
          return res.status(400).json({ 
            success: false, 
            message: `Video rate must be between ${levelConfig.videoRateRange.min} and ${levelConfig.videoRateRange.max} coins per minute` 
          });
        }
      }
      femaleUser.videoCoinsPerMinute = rate;
    }
    
    await femaleUser.save();
    
    return res.json({
      success: true,
      message: messages.USER_MANAGEMENT.CALL_RATES_UPDATED(femaleUser.name, femaleUser.email),
      data: {
        userId: femaleUser._id,
        name: femaleUser.name,
        email: femaleUser.email,
        audioCoinsPerMinute: femaleUser.audioCoinsPerMinute,
        videoCoinsPerMinute: femaleUser.videoCoinsPerMinute
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};