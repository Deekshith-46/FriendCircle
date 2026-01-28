const mongoose = require('mongoose');

const TopFanConfigSchema = new mongoose.Schema({
  maleEffort: {
    text: { type: Number, default: 1 },
    image: { type: Number, default: 2 },
    video: { type: Number, default: 3 },
    voice: { type: Number, default: 4 },
    audioCall: { type: Number, default: 5 },
    videoCall: { type: Number, default: 6 }
  },

  femaleResponse: {
    textReply: { type: Number, default: 2 },
    fastReplyBonus: { type: Number, default: 3 },
    voiceReply: { type: Number, default: 4 },
    callAnswered: { type: Number, default: 6 }
  },

  multipliers: [
    {
      min: Number,
      max: Number,
      factor: Number
    }
  ],

  minTopFanScore: {
    type: Number,
    default: 100
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Middleware to ensure only one active config exists
TopFanConfigSchema.pre('save', async function(next) {
  if (this.isActive) {
    // Deactivate all other active configs before saving this one as active
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    );
  }
  next();
});

// Static method to update the single config (ensuring only one exists)
TopFanConfigSchema.statics.updateSingleConfig = async function(updateData) {
  // Find existing config or create if none exists
  let config = await this.findOne({});
  
  if (config) {
    // Update the existing config
    Object.assign(config, updateData);
    return await config.save();
  } else {
    // Create new config (make it active by default)
    updateData.isActive = true;
    return await this.create(updateData);
  }
};

module.exports = mongoose.model('TopFanConfig', TopFanConfigSchema);