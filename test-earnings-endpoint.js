const axios = require('axios');

async function testEarningsSummary() {
  try {
    // First, login to get admin token
    const loginResponse = await axios.post('http://localhost:5001/admin/login', {
      email: 'admin@gmail.com',
      password: '12345678',
      userType: 'admin'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Admin login successful');
    
    // Test earnings summary endpoint
    const earningsResponse = await axios.get('http://localhost:5001/admin/earnings/summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Earnings summary endpoint working!');
    console.log('Response:', JSON.stringify(earningsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing earnings summary:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testEarningsSummary();