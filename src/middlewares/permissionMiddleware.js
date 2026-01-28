// Permission middleware for staff access control
const messages = require('../validations/messages');
const checkPermission = (module, action) => {
  return (req, res, next) => {
    // Admin has full access
    if (req.userType === 'admin') {
      return next();
    }

    // Staff permission check
    if (req.userType === 'staff') {
      const permissions = req.staff.permissions;
      const modulePermissions = permissions[module];

      if (!modulePermissions) {
        return res.status(403).json({ 
          success: false, 
          message: messages.PERMISSION.NO_ACCESS_MODULE(module) 
        });
      }

      // Check specific permission
      if (!modulePermissions[action]) {
        return res.status(403).json({ 
          success: false, 
          message: messages.PERMISSION.NO_PERMISSION_ACTION(action, module) 
        });
      }

      return next();
    }

    return res.status(401).json({ success: false, message: messages.PERMISSION.UNAUTHORIZED });
  };
};

// Helper function to get module from URL path
const getModuleFromPath = (path) => {
  if (path.includes('/interests')) return 'interest';
  if (path.includes('/languages')) return 'language';
  if (path.includes('/religions')) return 'religion';
  if (path.includes('/relation-goals')) return 'relationGoals';
  if (path.includes('/plans')) return 'plan';
  if (path.includes('/packages')) return 'package';
  if (path.includes('/pages')) return 'page';
  if (path.includes('/faqs')) return 'faq';
  if (path.includes('/gifts')) return 'gift';
  if (path.includes('/users')) return 'users';
  return null;
};

// Helper function to get action from HTTP method
const getActionFromMethod = (method) => {
  switch (method) {
    case 'GET': return 'read';
    case 'POST': return 'write';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'update'; // Treat delete as update permission
    default: return 'read';
  }
};

// Dynamic permission middleware
const dynamicPermissionCheck = (req, res, next) => {
  // Admin has full access
  if (req.userType === 'admin') {
    return next();
  }

  // Staff permission check
  if (req.userType === 'staff') {
    const module = getModuleFromPath(req.originalUrl);
    const action = getActionFromMethod(req.method);

    if (!module) {
      return next(); // Allow access to non-module routes
    }

    const permissions = req.staff.permissions;
    const modulePermissions = permissions[module];

    if (!modulePermissions) {
      return res.status(403).json({ 
        success: false, 
        message: messages.PERMISSION.NO_ACCESS_MODULE(module) 
      });
    }

    if (!modulePermissions[action]) {
      return res.status(403).json({ 
        success: false, 
        message: messages.PERMISSION.NO_PERMISSION_ACTION(action, module) 
      });
    }

    return next();
  }

  return res.status(401).json({ success: false, message: messages.PERMISSION.UNAUTHORIZED });
};

module.exports = {
  checkPermission,
  dynamicPermissionCheck
};
