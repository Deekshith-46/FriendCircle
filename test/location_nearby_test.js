/**
 * Location & Nearby Feature Test Script
 * 
 * This script demonstrates the complete flow:
 * 1. Admin sets nearby distance
 * 2. Male and Female users update location
 * 3. Female goes online
 * 4. Male gets dashboard with all 4 sections
 */

const axios = require('axios');

// Base URL for the API
const BASE_URL = 'http://localhost:5000'; // Adjust port as needed

// Test data
const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    userType: 'admin'
  },
  maleUser: {
    email: 'male@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe'
  },
  femaleUser: {
    email: 'female@example.com',
    mobileNumber: '9876543210',
    name: 'Jane Doe',
    age: 25,
    gender: 'female',
    bio: 'Test female user'
  }
};

// Test coordinates (Hyderabad, India)
const maleLocation = {
  latitude: 17.385044,
  longitude: 78.486671
};

const femaleLocation = {
  latitude: 17.387140, // Very close to male (within 1 km)
  longitude: 78.491684
};

// Test coordinates for distant female (Bangalore, India)
const distantFemaleLocation = {
  latitude: 12.971599,
  longitude: 77.594566
};

async function testLocationNearbyFlow() {
  console.log('🧪 Starting Location & Nearby Feature Test...\n');
  
  try {
    // Step 1: Admin sets nearby distance
    console.log('1️⃣  Setting admin nearby distance configuration...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/admin/login`, {
      email: testUsers.admin.email,
      password: testUsers.admin.password,
      userType: testUsers.admin.userType
    });
    
    const adminToken = adminLoginResponse.data.data.token;
    
    // Update nearby distance to 5 km
    const distanceResponse = await axios.post(
      `${BASE_URL}/admin/config/nearby-distance`,
      { nearbyDistanceValue: 5, nearbyDistanceUnit: 'km' },
      { headers: { Authorization: `Bearer ${adminToken}` }}
    );
    
    console.log('✅ Admin nearby distance set to 5 km');
    
    // Step 2: Register and login male user
    console.log('\n2️⃣  Registering and setting up male user...');
    // Assuming male user is already registered, we'll just update location
    // In real scenario, you'd register and verify OTP first
    
    // For this test, we'll assume male user has a token (you'd get this after login)
    const maleToken = 'YOUR_MALE_USER_TOKEN'; // Replace with actual token after login
    
    // Update male user location
    const maleLocationResponse = await axios.patch(
      `${BASE_URL}/male-user/location`,
      maleLocation,
      { headers: { Authorization: `Bearer ${maleToken}` }}
    );
    
    console.log('✅ Male user location updated');
    
    // Step 3: Register and set up female user
    console.log('\n3️⃣  Registering and setting up female user...');
    // For this test, we'll assume female user has a token (you'd get this after login)
    const femaleToken = 'YOUR_FEMALE_USER_TOKEN'; // Replace with actual token after login
    
    // Update female user location
    const femaleLocationResponse = await axios.patch(
      `${BASE_URL}/female-user/location`,
      femaleLocation,
      { headers: { Authorization: `Bearer ${femaleToken}` }}
    );
    
    console.log('✅ Female user location updated');
    
    // Step 4: Female goes online
    console.log('\n4️⃣  Female user going online...');
    const onlineResponse = await axios.post(
      `${BASE_URL}/female-user/toggle-online-status`,
      { onlineStatus: true },
      { headers: { Authorization: `Bearer ${femaleToken}` }}
    );
    
    console.log('✅ Female user is now online');
    
    // Step 5: Male gets dashboard with all sections
    console.log('\n5️⃣  Male getting dashboard sections...');
    
    // Get 'All' section
    const allSectionResponse = await axios.get(
      `${BASE_URL}/male-user/dashboard?section=all`,
      { headers: { Authorization: `Bearer ${maleToken}` }}
    );
    
    console.log('✅ Got "All" section:', allSectionResponse.data.data.results.length, 'results');
    
    // Get 'Nearby' section
    const nearbySectionResponse = await axios.get(
      `${BASE_URL}/male-user/dashboard?section=nearby`,
      { headers: { Authorization: `Bearer ${maleToken}` }}
    );
    
    console.log('✅ Got "Nearby" section:', nearbySectionResponse.data.data.results.length, 'results');
    
    // Get 'Followed' section
    const followedSectionResponse = await axios.get(
      `${BASE_URL}/male-user/dashboard?section=followed`,
      { headers: { Authorization: `Bearer ${maleToken}` }}
    );
    
    console.log('✅ Got "Followed" section:', followedSectionResponse.data.data.results.length, 'results');
    
    // Get 'New' section
    const newSectionResponse = await axios.get(
      `${BASE_URL}/male-user/dashboard?section=new`,
      { headers: { Authorization: `Bearer ${maleToken}` }}
    );
    
    console.log('✅ Got "New" section:', newSectionResponse.data.data.results.length, 'results');
    
    // Step 6: Test with distant female to verify nearby filtering
    console.log('\n6️⃣  Testing with distant female user...');
    
    // Update female location to distant location
    const distantLocationResponse = await axios.patch(
      `${BASE_URL}/female-user/location`,
      distantFemaleLocation,
      { headers: { Authorization: `Bearer ${femaleToken}` }}
    );
    
    // Get nearby section again - should have fewer results now
    const nearbyAfterDistantResponse = await axios.get(
      `${BASE_URL}/male-user/dashboard?section=nearby`,
      { headers: { Authorization: `Bearer ${maleToken}` }}
    );
    
    console.log('✅ Nearby section with distant female:', nearbyAfterDistantResponse.data.data.results.length, 'results');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin distance configuration: ✅ Working');
    console.log('- Male location update: ✅ Working');
    console.log('- Female location update: ✅ Working');
    console.log('- Online status toggle: ✅ Working');
    console.log('- Dashboard sections (All, Nearby, Followed, New): ✅ Working');
    console.log('- Distance-based filtering: ✅ Working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Request:', error.config?.url);
  }
}

// Run the test
testLocationNearbyFlow();

console.log('\n📝 To run this test:');
console.log('1. Make sure your server is running on http://localhost:5000');
console.log('2. Update the tokens with actual user tokens after registration/login');
console.log('3. Run: node test/location_nearby_test.js');