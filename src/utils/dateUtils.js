// src/utils/dateUtils.js

/**
 * Get start of day (00:00:00.000) - normalized to local date (IST)
 * @param {Date} date - Date to process (defaults to now)
 * @returns {Date} Start of day in UTC
 */
exports.getStartOfDay = (date = new Date()) => {
  // Get the date components in the user's local timezone
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create a new date at the start of the day in local timezone
  const startOfDayLocal = new Date(year, month, day, 0, 0, 0, 0);
  
  // Convert to UTC for consistent storage
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
};

/**
 * Get end of day (23:59:59.999) - normalized to local date (IST)
 * @param {Date} date - Date to process (defaults to now)
 * @returns {Date} End of day in UTC
 */
exports.getEndOfDay = (date = new Date()) => {
  // Get the date components in the user's local timezone
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create a new date at the end of the day in local timezone
  const endOfDayLocal = new Date(year, month, day, 23, 59, 59, 999);
  
  // Convert to UTC for consistent storage
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
};

/**
 * Get start of week (Monday 00:00:00.000) - normalized to local date (IST)
 * @param {Date} date - Date to process (defaults to now)
 * @returns {Date} Start of week (Monday) in UTC
 */
exports.getStartOfWeek = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create a new date at the start of the day in local timezone
  const startOfDayLocal = new Date(year, month, day, 0, 0, 0, 0);
  
  const dayOfWeek = startOfDayLocal.getDay();
  const diff = startOfDayLocal.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const monday = new Date(startOfDayLocal);
  monday.setDate(diff);
  
  // Convert to UTC for consistent storage
  return new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
};

/**
 * Normalize date to midnight for consistent referenceDate - based on local date (IST)
 * @param {Date} date - Date to normalize
 * @returns {Date} Normalized date at 00:00:00.000 in UTC
 */
exports.normalizeDate = (date = new Date()) => {
  // Get the date components in the user's local timezone
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Convert to UTC for consistent storage
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
};

/**
 * Resolves date range for API queries
 * @param {string} startDate - Start date string (optional)
 * @param {string} endDate - End date string (optional)
 * @returns {Object} Object containing start and end Date objects
 */
exports.resolveDateRange = (startDate, endDate) => {
  let start;
  let end;

  if (startDate && endDate) {
    // Custom date range
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    // Default → TODAY
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date(); // now
  }

  return { start, end };
};