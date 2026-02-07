const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

module.exports = async function resetDailyOnlineMinutes(user) {
  const today = new Date();

  // If no reset date exists, initialize it
  if (!user.lastOnlineResetDate) {
    user.totalOnlineMinutes = 0;
    user.lastOnlineResetDate = today;
    return;
  }

  // If it's a different day, reset the counter
  if (!isSameDay(user.lastOnlineResetDate, today)) {
    user.totalOnlineMinutes = 0;
    user.lastOnlineResetDate = today;
  }
};