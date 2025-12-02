import admin from 'firebase-admin';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

let firebaseInitialized = false;

// Initialize Firebase Admin
export const initializeFirebase = () => {
  try {
    if (firebaseInitialized) return;

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (!serviceAccountPath) {
      logger.warn('Firebase service account path not found. Push notifications will be disabled.');
      return;
    }

    const serviceAccountPathResolved = path.resolve(serviceAccountPath);
    const serviceAccountContent = fs.readFileSync(serviceAccountPathResolved, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountContent);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    logger.info('Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Firebase initialization error:', error);
  }
};

// Send push notification to a single device
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    logger.info(`Push notification sent successfully: ${response}`);
    return response;
  } catch (error) {
    logger.error('Send push notification error:', error);
    throw error;
  }
};

// Send push notification to multiple devices
export const sendPushNotificationToMultiple = async (
  fcmTokens: string[],
  title: string,
  body: string,
  data?: any
) => {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(`Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);
    return response;
  } catch (error) {
    logger.error('Send push notification to multiple error:', error);
    throw error;
  }
};

// Send prayer time reminder
export const sendPrayerReminder = async (
  fcmToken: string,
  prayerName: string,
  prayerTime: string,
  minutesBefore: number = 10
) => {
  try {
    const title = `${prayerName} Prayer Time`;
    const body = minutesBefore > 0
      ? `${prayerName} prayer is in ${minutesBefore} minutes (${prayerTime})`
      : `It's time for ${prayerName} prayer (${prayerTime})`;

    return await sendPushNotification(fcmToken, title, body, {
      type: 'prayer_reminder',
      prayerName,
      prayerTime,
    });
  } catch (error) {
    logger.error('Send prayer reminder error:', error);
    throw error;
  }
};

// Send daily reminder (e.g., for morning/evening dhikr)
export const sendDailyReminder = async (
  fcmToken: string,
  reminderType: 'morning' | 'evening',
  message: string
) => {
  try {
    const title = reminderType === 'morning' ? 'Morning Dhikr Reminder' : 'Evening Dhikr Reminder';
    const body = message;

    return await sendPushNotification(fcmToken, title, body, {
      type: 'daily_reminder',
      reminderType,
    });
  } catch (error) {
    logger.error('Send daily reminder error:', error);
    throw error;
  }
};

// Subscribe to topic
export const subscribeToTopic = async (fcmToken: string, topic: string) => {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized');
    }

    const response = await admin.messaging().subscribeToTopic(fcmToken, topic);
    logger.info(`Subscribed to topic ${topic}: ${response}`);
    return response;
  } catch (error) {
    logger.error('Subscribe to topic error:', error);
    throw error;
  }
};

// Unsubscribe from topic
export const unsubscribeFromTopic = async (fcmToken: string, topic: string) => {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase not initialized');
    }

    const response = await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
    logger.info(`Unsubscribed from topic ${topic}: ${response}`);
    return response;
  } catch (error) {
    logger.error('Unsubscribe from topic error:', error);
    throw error;
  }
};

