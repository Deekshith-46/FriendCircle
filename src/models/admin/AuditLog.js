const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  action: { type: String, required: true },       // e.g., CREATE, UPDATE, DELETE
  entity: { type: String, required: true },       // e.g., Interest, Gift
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: Object,                                // Optional JSON snapshot
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
