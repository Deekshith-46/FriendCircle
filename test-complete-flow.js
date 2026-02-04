const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create a valid token with an existing user ID
const token = jwt.sign(
    {id:'6982f14f3b2d8401b7e375fe', type:'male'}, 
    'of59sJz15brpbZUamVjeI+yqkdUpLkg6R3j9bE9dBzYGQRINl6X3BbxEDrkBVY31qOad5gpqk8pL/D7SmuVnZA==', 
    {expiresIn: '24h'}
);

console.log('Using token:', token);

async function testCompleteFlow() {
    try {
        // 1. Get packages
        console.log('\n1. Getting coin packages...');
        const packagesResponse = await axios.get('http://localhost:5001/male-user/payment/packages', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Packages:', packagesResponse.data);
        
        if (packagesResponse.data.data.length === 0) {
            console.log('No packages available');
            return;
        }
        
        // 2. Create order for the first package
        const firstPackage = packagesResponse.data.data[0];
        console.log('\n2. Creating order for package:', firstPackage);
        
        const orderResponse = await axios.post('http://localhost:5001/male-user/payment/coin/order', {
            packageId: firstPackage._id
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Order response:', orderResponse.data);
        
        if (orderResponse.data.success) {
            console.log('✅ Order created successfully!');
            console.log('Order ID:', orderResponse.data.data.orderId);
        } else {
            console.log('❌ Order creation failed:', orderResponse.data.message);
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testCompleteFlow();