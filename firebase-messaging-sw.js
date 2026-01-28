importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 🔴 SAME firebaseConfig as index.html
firebase.initializeApp({
    apiKey: "AIzaSyATP24MQ3PITrpoBsBoEJvC_efQf99romo",
    authDomain: "friendcircle-notifications.firebaseapp.com",
    projectId: "friendcircle-notifications",
    storageBucket: "friendcircle-notifications.firebasestorage.app",
    messagingSenderId: "336749988199",
    appId: "1:336749988199:web:4cb9b0d9ff27d63c9987c2",
    measurementId: "G-DP46EJ1FRW"
});

const messaging = firebase.messaging();

// Optional: handle background notifications
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    self.registration.showNotification(
        payload.notification.title,
        {
            body: payload.notification.body,
            icon: '/icon.png'
        }
    );
});
