const admin = require('firebase-admin');
const path = require('path');

let initialized = false;

try {
  if (!admin.apps.length) {
    // Try environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase initialized from environment variable');
        initialized = true;
      } catch (error) {
        console.error('❌ Invalid Firebase service account JSON:', error.message);
      }
    }
    
    // Fallback to local file (development only)
    if (!initialized) {
      const serviceAccountPath = path.join(__dirname, '../../config/firebaseServiceAccount.json');
      try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase initialized from local file');
        initialized = true;
      } catch (error) {
        console.warn('⚠️ Firebase service account not found. Notifications will be mocked.');
      }
    }
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

const getMessaging = () => {
  if (initialized) {
    return admin.messaging();
  } else {
    return {
      send: () => Promise.resolve('mock'),
      sendMulticast: () => Promise.resolve({ responses: [] })
    };
  }
};

module.exports = { admin, getMessaging };

// const admin = require('firebase-admin');
// const path = require('path');

// // Load service account JSON directly
// const serviceAccount = require('../../config/firebaseServiceAccount.json');

// // Initialize Firebase Admin SDK ONCE
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });

//   console.log('✅ Firebase Admin initialized with service account');
// }

// // Export messaging
// const getMessaging = () => admin.messaging();

// module.exports = {
//   admin,
//   getMessaging,
// };
