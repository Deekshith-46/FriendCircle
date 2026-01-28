export const isValidEmail = (email) => {
  // 1️⃣ Must exist
  if (!email) return false;

  // 2️⃣ Must be string
  if (typeof email !== "string") return false;

  // 3️⃣ Trim spaces
  email = email.trim();

  // 4️⃣ Email regex
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);
};

export const isValidMobile = (mobileNumber) => {
  // 1️⃣ Must exist
  if (!mobileNumber) return false;

  // 2️⃣ Must be string or number
  if (typeof mobileNumber !== "string" && typeof mobileNumber !== "number") {
    return false;
  }

  // 3️⃣ Convert to string & trim spaces
  const mobile = mobileNumber.toString().trim();

  // 4️⃣ Must be exactly 10 digits & start with 6–9
  const mobileRegex = /^[6-9]\d{9}$/;

  return mobileRegex.test(mobile);
};