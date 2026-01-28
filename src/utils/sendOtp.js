const sgMail = require('@sendgrid/mail');

// Set SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOtp = async (email, otp) => {
  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL, // e.g., tdeekshith46@gmail.com
      name: process.env.SENDGRID_FROM_NAME,   // e.g., My App
    },
    subject: 'OTP Verification',
    text: `Your OTP is: ${otp}`,
    html: `<p>Your OTP is: <strong>${otp}</strong></p>`, // Added HTML for better formatting
  };

  try {
    await sgMail.send(msg);
    console.log(`OTP sent to ${email}: ${otp}`);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP:', error.response?.body || error);
    throw new Error('Failed to send OTP');
  }
};

module.exports = sendOtp;