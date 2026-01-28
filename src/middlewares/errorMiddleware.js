// src/middlewares/errorMiddleware.js
const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack); // Log the error for debugging
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Show stack trace only in development
  });
};

module.exports = errorMiddleware;