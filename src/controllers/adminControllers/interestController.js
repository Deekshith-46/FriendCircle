const Interest = require('../../models/admin/Interest');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');

// Create Interest
exports.createInterest = async (req, res) => {
  try {
    const { title, status } = req.body;
    
    let imageUrl = null;
    if (req.file) {
      // Upload image to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, 'interests');
      imageUrl = result.secure_url;
    }

    const userId = getUserId(req);

    const interest = await Interest.create({
      title,
      imageUrl,
      status,
      createdBy: userId
    });

    await createAuditLog(userId, 'CREATE', 'Interest', interest._id, { title, status, imageUrl });

    res.status(201).json({ success: true, data: interest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get All Interests
exports.getAllInterests = async (req, res) => {
  try {
    const interests = await Interest.find();
    res.json({ success: true, data: interests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Interest
exports.updateInterest = async (req, res) => {
  try {
    const { title, status } = req.body;
    
    const updateData = { title, status };
    if (req.file) {
      // Upload image to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, 'interests');
      updateData.imageUrl = result.secure_url;
    }

    const userId = getUserId(req);

    const interest = await Interest.findByIdAndUpdate(req.params.id, updateData, { new: true });

    await createAuditLog(userId, 'UPDATE', 'Interest', interest._id, updateData);

    res.json({ success: true, data: interest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Interest
exports.deleteInterest = async (req, res) => {
  try {
    const interest = await Interest.findByIdAndDelete(req.params.id);
    
    const userId = getUserId(req);
    
    await createAuditLog(userId, 'DELETE', 'Interest', interest._id, { title: interest.title });
    res.json({ success: true, message: 'Interest deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};