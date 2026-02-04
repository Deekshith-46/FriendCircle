const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODJmMTRmM2IyZDg0MDFiN2UzNzVmZSIsInR5cGUiOiJtYWxlIiwiaWF0IjoxNzcwMTg5NTk5LCJleHAiOjE3NzAyNzU5OTl9.W2gNrFVKDiMXn_fBXladq_9Lt2L4VWt5NUUeHaY_0UU';

// Test male user followers endpoint
axios.get('http://localhost:5001/male-user/followers', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(res => {
    console.log('Followers response:', res.data);
    if (res.data.success && res.data.data.length > 0) {
        console.log('\nSample user data:');
        res.data.data.slice(0, 2).forEach((user, index) => {
            console.log(`${index + 1}. Name: "${user.name}", Age: ${user.age}, Online: ${user.onlineStatus}`);
        });
    }
})
.catch(err => {
    console.error('Followers error:', err.response?.data || err.message);
});