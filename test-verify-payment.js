// Simple test to directly call verifyPayment endpoint
require('dotenv').config();
const axios = require('axios');

async function testVerifyPaymentDirectly() {
  try {
    console.log('🚀 Testing verifyPayment endpoint directly...');
    
    // 1. Get OTP for login
    console.log('1. Getting OTP...');
    const loginResponse = await axios.post('http://localhost:5001/male-user/login', {
      email: 'maleA123@gmail.com',
      password: '12345678'
    });
    
    const otp = loginResponse.data.otp;
    console.log('✅ Got OTP:', otp);
    
    // 2. Login with OTP
    console.log('2. Logging in with OTP...');
    const verifyResponse = await axios.post('http://localhost:5001/male-user/verify-login-otp', {
      otp: otp
    });
    
    const token = verifyResponse.data.token;
    console.log('✅ Login successful');
    
    // 3. Call verifyPayment with mock data to test if the endpoint is hit
    console.log('3. Calling verifyPayment endpoint...');
    const verifyPaymentResponse = await axios.post('http://localhost:5001/male-user/payment/verify', {
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_test_456',
      razorpay_signature: 'test_signature_789'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ verifyPayment response:', verifyPaymentResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testVerifyPaymentDirectly();