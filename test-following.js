const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODJmMTRmM2IyZDg0MDFiN2UzNzVmZSIsInR5cGUiOiJtYWxlIiwiaWF0IjoxNzcwMTg5NTk5LCJleHAiOjE3NzAyNzU5OTl9.W2gNrFVKDiMXn_fBXladq_9Lt2L4VWt5NUUeHaY_0UU';

// Test male user following endpoint
axios.get('http://localhost:5001/male-user/following', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(res => {
    console.log('Following response:', res.data);
})
.catch(err => {
    console.error('Following error:', err.response?.data || err.message);
});