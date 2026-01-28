const AuditLog = require('../models/admin/AuditLog');

const createAuditLog = async (adminId, action, entity, entityId, details = {}) => {
  await AuditLog.create({
    admin: adminId,
    action,
    entity,
    entityId,
    details
  });
};

module.exports = createAuditLog;
