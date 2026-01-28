const express = require('express');
const router = express.Router();
const followRequestController = require('../../controllers/femaleUserControllers/followRequestController');
const auth = require('../../middlewares/authMiddleware');

// Get Received Follow Requests
router.get('/received', auth, followRequestController.getReceivedFollowRequests);

// Accept a Follow Request
router.post('/accept', auth, followRequestController.acceptFollowRequest);

// Reject a Follow Request
router.post('/reject', auth, followRequestController.rejectFollowRequest);

// Get All Follow Requests (with optional status filter)
router.get('/all', auth, followRequestController.getAllFollowRequests);

module.exports = router;