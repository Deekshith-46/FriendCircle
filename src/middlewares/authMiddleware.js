const jwt = require('jsonwebtoken');
const AdminUser = require('../models/admin/AdminUser');
const Staff = require('../models/admin/Staff');
const FemaleUser = require('../models/femaleUser/FemaleUser'); // Import FemaleUser model
const MaleUser = require('../models/maleUser/MaleUser');
const AgencyUser = require('../models/agency/AgencyUser');
const messages = require('../validations/messages');
const auth = async (req, res, next) => {
  let token;
  
  // Check if the Authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token is found, respond with a 401 status
  if (!token) {
    return res.status(401).json({ success: false, message: messages.AUTH_MIDDLEWARE.NOT_AUTHORIZED });
  }

  try {
    // Decode the token to get user information (either admin or female user)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check the route and decide whether to authenticate an admin, staff, or other users
    if (req.originalUrl.startsWith('/admin')) {
      // Try admin first, then staff
      req.admin = await AdminUser.findById(decoded.id).select('-passwordHash');
      if (req.admin) {
        req.userType = 'admin';
      } else {
        req.staff = await Staff.findById(decoded.id).select('-passwordHash');
        if (req.staff) {
          req.userType = 'staff';
        } else {
          return res.status(404).json({ success: false, message: messages.AUTH_MIDDLEWARE.USER_NOT_FOUND });
        }
      }
    } else if (req.originalUrl.startsWith('/female-user')) {
      // Female user authentication
      req.user = await FemaleUser.findById(decoded.id); // Store user data in req.user
      if (!req.user) {
        return res.status(404).json({ success: false, message: messages.AUTH_MIDDLEWARE.USER_NOT_FOUND });
      }
      req.userType = 'female'; // Set user type
    } else if (req.originalUrl.startsWith('/male-user')) {
        // Male user authentication
        req.user = await MaleUser.findById(decoded.id); // Store user data in req.user
        if (!req.user) {
            return res.status(404).json({ success: false, message: messages.AUTH_MIDDLEWARE.USER_NOT_FOUND });
        }
        req.userType = 'male'; // Set user type
    } else if (req.originalUrl.startsWith('/agency')) {
        console.log('=== AGENCY AUTH MIDDLEWARE ===');
        console.log('Original URL:', req.originalUrl);
        console.log('Decoded user ID:', decoded.id);
        // Agency user authentication
        req.user = await AgencyUser.findById(decoded.id);
        console.log('Found agency user:', !!req.user);
        if (!req.user) {
            console.log('Agency user not found');
            return res.status(404).json({ success: false, message: messages.AUTH_MIDDLEWARE.USER_NOT_FOUND });
        }
        req.userType = 'agency'; // Set user type
        console.log('Agency auth successful, user type:', req.userType);
    } else {
        // General user authentication for other routes (like /chat)
        // Try to find user in different collections
        let user;
        let userType;
        
        user = await FemaleUser.findById(decoded.id);
        if (user) {
          userType = 'female';
        } else {
          user = await MaleUser.findById(decoded.id);
          if (user) {
            userType = 'male';
          } else {
            user = await AdminUser.findById(decoded.id);
            if (user) {
              userType = 'admin';
            } else {
              user = await AgencyUser.findById(decoded.id);
              if (user) {
                userType = 'agency';
              }
            }
          }
        }
        
        if (!user) {
          return res.status(404).json({ success: false, message: messages.AUTH_MIDDLEWARE.USER_NOT_FOUND });
        }
        
        req.user = user;
        req.userType = userType;
    }

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: messages.AUTH_MIDDLEWARE.INVALID_TOKEN });
  }
};

module.exports = auth;


// const jwt = require('jsonwebtoken');
// const AdminUser = require('../models/admin/AdminUser');

// const auth = async (req, res, next) => {
//   let token;
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     token = req.headers.authorization.split(' ')[1];
//   }
//   if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.admin = await AdminUser.findById(decoded.id).select('-passwordHash');
//     next();
//   } catch (error) {
//     res.status(401).json({ success: false, message: messages.AUTH_MIDDLEWARE.INVALID_TOKEN });
//   }
// };

// module.exports = auth;
