const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create a valid token
const token = jwt.sign(
    {id:'69819ac37cf509559406678d', type:'male'}, 
    'of59sJz15brpbZUamVjeI+yqkdUpLkg6R3j9bE9dBzYGQRINl6X3BbxEDrkBVY31qOad5gpqk8pL/D7SmuVnZA==', 
    {expiresIn: '24h'}
);

console.log('Using token:', token);

// Test the packages endpoint
axios.get('http://localhost:5001/male-user/payment/packages', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(res => {
    console.log('Success:', res.data);
})
.catch(err => {
    console.error('Error:', err.response?.data || err.message);
});