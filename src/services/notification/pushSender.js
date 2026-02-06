const admin = require('../../config/firebase');
const { getMessaging } = require('firebase-admin/messaging');
const { removeFCMToken } = require('./fcmManager');

// Send push notification via FCM with retry logic and better error handling
const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token) {
      console.log('No FCM token provided');
      return false;
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'high_importance_channel'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    };

    // First attempt
    let response;
    try {
      response = await getMessaging().send(message);
      console.log('Push notification sent successfully:', response);
      return true;
    } catch (firstAttemptError) {
      console.error('First attempt failed:', firstAttemptError.code, firstAttemptError.message);
      
      // Handle specific FCM errors
      if (firstAttemptError.code === 'messaging/invalid-registration-token' ||
          firstAttemptError.code === 'messaging/registration-token-not-registered') {
        console.log('Invalid FCM token detected, removing from database:', token);
        // Token is invalid, remove it from the database
        // We need to extract userId and userType from the data to remove the token
        // Prioritize receiverId/receiverType if available (most common for notifications)
        if (data.receiverId && data.receiverType) {
          await removeFCMToken(data.receiverId, data.receiverType, token);
        } else if (data.senderId && data.senderType) {
          await removeFCMToken(data.senderId, data.senderType, token);
        } else if (data.userId && data.userType) {
          // Fallback to userId/userType if available
          await removeFCMToken(data.userId, data.userType, token);
        }
        return false;
      } else if (firstAttemptError.code === 'messaging/device-message-rate-exceeded') {
        console.log('Rate limit exceeded, waiting before retry...');
        // Wait and retry once more
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        try {
          response = await getMessaging().send(message);
          console.log('Push notification sent on retry:', response);
          return true;
        } catch (retryError) {
          console.error('Retry also failed:', retryError.code, retryError.message);
          return false;
        }
      } else {
        // Other errors, might be temporary, return false
        return false;
      }
    }
  } catch (error) {
    console.error('Unexpected error sending push notification:', error);
    return false;
  }
};

// Send multiple push notifications with individual token handling
const sendMultiplePushNotifications = async (tokens, title, body, data = {}) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    console.log('No tokens provided for batch notification');
    return { successCount: 0, failureCount: 0, results: [] };
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const token of tokens) {
    const result = await sendPushNotification(token, title, body, data);
    results.push({ token, success: result });
    if (result) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return { successCount, failureCount, results };
};

module.exports = {
  sendPushNotification,
  sendMultiplePushNotifications
};