const axios = require('axios');

async function testMaleEndpoints() {
  try {
    // Test followers endpoint
    console.log('Testing /male-user/followers...');
    const followersResponse = await axios.get('http://localhost:5001/male-user/followers', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODE5YWMzN2NmNTA5NTU5NDA2Njc4ZCIsInR5cGUiOiJtYWxlIiwiaWF0IjoxNzcwMTAxNDU3LCJleHAiOjE3NzAxODc4NTd9.TEST_TOKEN'
      }
    });
    
    console.log('Followers response:', followersResponse.data);
    
    // Test following endpoint
    console.log('\nTesting /male-user/following...');
    const followingResponse = await axios.get('http://localhost:5001/male-user/following', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODE5YWMzN2NmNTA5NTU5NDA2Njc4ZCIsInR5cGUiOiJtYWxlIiwiaWF0IjoxNzcwMTAxNDU3LCJleHAiOjE3NzAxODc4NTd9.TEST_TOKEN'
      }
    });
    
    console.log('Following response:', followingResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testMaleEndpoints();