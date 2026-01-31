const admin = require('../../config/firebase');
const { getMessaging } = require('firebase-admin/messaging');

// Send push notification via FCM
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

    const response = await getMessaging().send(message);
    console.log('Push notification sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

module.exports = {
  sendPushNotification
};