const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const staffController = require('../../controllers/adminControllers/staffController');

// All routes require admin auth
router.post('/', auth, staffController.createStaff);
router.get('/', auth, staffController.listStaff);
router.patch('/:id', auth, staffController.updateStaff);
router.delete('/:id', auth, staffController.deleteStaff);

module.exports = router;


