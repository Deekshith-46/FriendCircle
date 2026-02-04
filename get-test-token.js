const axios = require('axios');

async function getTestToken() {
    try {
        // Register new user
        console.log('Registering new user...');
        const registerResponse = await axios.post('http://localhost:5001/male-user/register', {
            mobileNumber: '9876543212',
            email: 'test3@example.com',
            password: 'test123456',
            firstName: 'Test3',
            lastName: 'User3'
        });

        console.log('Registration response:', registerResponse.data);
        const otp = registerResponse.data.otp;
        console.log('OTP received:', otp);

        // Verify OTP
        console.log('Verifying OTP...');
        const verifyResponse = await axios.post('http://localhost:5001/male-user/verify-otp', {
            mobileNumber: '9876543212',
            otp: otp
        });

        console.log('Verification response:', verifyResponse.data);
        const token = verifyResponse.data.data.token;
        console.log('JWT Token:', token);

        // Test the packages endpoint
        console.log('Testing packages endpoint...');
        const packagesResponse = await axios.get('http://localhost:5001/male-user/payment/packages', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Packages response:', packagesResponse.data);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

getTestToken();