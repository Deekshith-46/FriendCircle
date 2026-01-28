// Utility function to get user ID from either admin or staff
const getUserId = (req) => {
  if (req.admin) {
    return req.admin._id;
  } else if (req.staff) {
    return req.staff._id;
  }
  return null;
};

module.exports = getUserId;
