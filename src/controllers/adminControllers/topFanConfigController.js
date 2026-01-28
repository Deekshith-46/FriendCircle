const TopFanConfig = require('../../models/admin/TopFanConfig');
const createAuditLog = require('../../utils/createAuditLog');
const getUserId = require('../../utils/getUserId');

// Validate config data before saving
const validateConfig = (configData) => {
  // Validate multiplier ranges
  if (configData.multipliers && Array.isArray(configData.multipliers)) {
    for (let i = 0; i < configData.multipliers.length; i++) {
      const multiplier = configData.multipliers[i];
      
      // Check if min <= max
      if (multiplier.min > multiplier.max) {
        throw new Error(`Multiplier range invalid: min (${multiplier.min}) must be <= max (${multiplier.max})`);
      }
      
      // Check for overlapping ranges with previous multipliers
      for (let j = 0; j < i; j++) {
        const prevMultiplier = configData.multipliers[j];
        if (multiplier.min <= prevMultiplier.max && multiplier.max >= prevMultiplier.min) {
          throw new Error(`Overlapping multiplier ranges detected: [${multiplier.min}-${multiplier.max}] overlaps with [${prevMultiplier.min}-${prevMultiplier.max}]`);
        }
      }
    }
  }
  
  // Validate that required fields have valid values
  if (typeof configData.minTopFanScore !== 'number' || configData.minTopFanScore < 0) {
    throw new Error('minTopFanScore must be a non-negative number');
  }
  
  // Validate maleEffort values
  const requiredMaleEffortFields = ['text', 'image', 'video', 'voice', 'audioCall', 'videoCall'];
  for (const field of requiredMaleEffortFields) {
    if (configData.maleEffort && typeof configData.maleEffort[field] !== 'number') {
      throw new Error(`maleEffort.${field} must be a number`);
    }
  }
  
  // Validate femaleResponse values
  const requiredFemaleResponseFields = ['textReply', 'fastReplyBonus', 'voiceReply', 'callAnswered'];
  for (const field of requiredFemaleResponseFields) {
    if (configData.femaleResponse && typeof configData.femaleResponse[field] !== 'number') {
      throw new Error(`femaleResponse.${field} must be a number`);
    }
  }
};

// Create or Update Top Fan Config (only one allowed)
exports.createConfig = async (req, res) => {
  try {
    // Validate the config data
    validateConfig(req.body);
    
    // Use the static method to ensure only one config exists
    const config = await TopFanConfig.updateSingleConfig(req.body);

    const userId = getUserId(req);
    await createAuditLog(userId, 'CREATE/UPDATE', 'TopFanConfig', config._id, req.body);

    res.json({ success: true, data: config, message: 'Top Fan Config saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update Top Fan Config
exports.updateConfig = async (req, res) => {
  try {
    // Validate the config data
    validateConfig(req.body);
    
    // Use the static method to ensure only one config exists
    const config = await TopFanConfig.updateSingleConfig(req.body);

    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }

    const userId = getUserId(req);
    await createAuditLog(userId, 'UPDATE', 'TopFanConfig', config._id, req.body);

    res.json({ success: true, data: config, message: 'Top Fan Config updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Top Fan Config
exports.deleteConfig = async (req, res) => {
  try {
    const config = await TopFanConfig.findByIdAndDelete(req.params.id);

    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }

    const userId = getUserId(req);
    await createAuditLog(userId, 'DELETE', 'TopFanConfig', config._id, { deletedConfig: config });

    res.json({ success: true, message: 'Config deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Active Config
exports.getActiveConfig = async (req, res) => {
  try {
    const config = await TopFanConfig.findOne({ isActive: true });

    if (!config) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Top Fan config found. Please contact admin.' 
      });
    }

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get All Configs
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await TopFanConfig.find().sort({ createdAt: -1 });
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Config by ID
exports.getConfigById = async (req, res) => {
  try {
    const config = await TopFanConfig.findById(req.params.id);

    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Activate Config
exports.activateConfig = async (req, res) => {
  try {
    // Deactivate all other configs first
    await TopFanConfig.updateMany(
      { isActive: true },
      { isActive: false }
    );

    // Activate the specified config
    const config = await TopFanConfig.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }

    const userId = getUserId(req);
    await createAuditLog(userId, 'ACTIVATE', 'TopFanConfig', config._id, { activated: true });

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Active Config (for internal use)
exports.getActiveConfigInternal = async () => {
  return await TopFanConfig.findOne({ isActive: true });
};