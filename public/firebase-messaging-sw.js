// firebase-messaging-sw.js
// Required for Firebase Cloud Messaging to work in web browsers

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration (same as in test-fcm.html)
const firebaseConfig = {
    apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
    authDomain: "friendcircle-notifications.firebaseapp.com",
    projectId: "friendcircle-notifications",
    storageBucket: "friendcircle-notifications.firebasestorage.app",
    messagingSenderId: "336749988199",
    appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
    measurementId: "G-DP46EJ1FRW"
};

// Initialize Firebase in service worker context
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Optional: Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message: ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico'
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

console.log('Firebase Messaging Service Worker initialized');