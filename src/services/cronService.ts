import cron from 'node-cron';
import mongoose from 'mongoose';
import User from '../models/mongodb/User';
import PrayerTime from '../models/mongodb/PrayerTime';
import { sendPrayerReminder, sendDailyReminder } from './notificationService';
import logger from '../utils/logger';
import axios from 'axios';

const ALADHAN_API = process.env.ALADHAN_API_URL || 'https://api.aladhan.com/v1';

// Check and send prayer reminders every minute
export const startPrayerReminderCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      logger.debug('Running prayer reminder cron job');

      // Get all users with prayer notifications enabled
      const users = await User.find({
        prayerNotifications: true,
      });

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      for (const user of users) {
        if (!user.fcmToken) continue;

        // Get user's latest prayer times for today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        
        const latestPrayerTime = await PrayerTime.findOne({
          userId: new mongoose.Types.ObjectId(user.id),
          date: { $gte: todayStart, $lt: todayEnd },
        }).sort({ createdAt: -1 });

        if (!latestPrayerTime) continue;

        const timings = latestPrayerTime.timings as any;
        const reminderSettings = user.reminderSettings as any;
        const beforeMinutes = reminderSettings.beforeMinutes || 10;

        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        for (const prayer of prayers) {
          if (!reminderSettings[prayer.toLowerCase()]) continue;

          const prayerTimeStr = timings[prayer];
          if (!prayerTimeStr) continue;

          const [hours, minutes] = prayerTimeStr.split(':').map(Number);
          const prayerTime = hours * 60 + minutes;
          const reminderTime = prayerTime - beforeMinutes;

          // Send reminder if current time matches reminder time
          if (currentTime === reminderTime) {
            try {
              await sendPrayerReminder(
                user.fcmToken,
                prayer,
                prayerTimeStr,
                beforeMinutes
              );
              logger.info(`Sent prayer reminder to user ${user.id} for ${prayer}`);
            } catch (error) {
              logger.error(`Failed to send prayer reminder to user ${user.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Prayer reminder cron error:', error);
    }
  });

  logger.info('Prayer reminder cron job started');
};

// Send morning dhikr reminder at 6:00 AM
export const startMorningReminderCron = () => {
  cron.schedule('0 6 * * *', async () => {
    try {
      logger.info('Running morning dhikr reminder cron job');

      const users = await User.find({
        prayerNotifications: true,
      });

      for (const user of users) {
        if (!user.fcmToken) continue;

        try {
          await sendDailyReminder(
            user.fcmToken,
            'morning',
            "Don't forget your morning dhikr and supplications!"
          );
          logger.info(`Sent morning reminder to user ${user.id}`);
        } catch (error) {
          logger.error(`Failed to send morning reminder to user ${user.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Morning reminder cron error:', error);
    }
  });

  logger.info('Morning dhikr reminder cron job started');
};

// Send evening dhikr reminder at 6:00 PM
export const startEveningReminderCron = () => {
  cron.schedule('0 18 * * *', async () => {
    try {
      logger.info('Running evening dhikr reminder cron job');

      const users = await User.find({
        prayerNotifications: true,
      });

      for (const user of users) {
        if (!user.fcmToken) continue;

        try {
          await sendDailyReminder(
            user.fcmToken,
            'evening',
            "Don't forget your evening dhikr and supplications!"
          );
          logger.info(`Sent evening reminder to user ${user.id}`);
        } catch (error) {
          logger.error(`Failed to send evening reminder to user ${user.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Evening reminder cron error:', error);
    }
  });

  logger.info('Evening dhikr reminder cron job started');
};

// Update prayer times daily at midnight
export const startPrayerTimesUpdateCron = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running prayer times update cron job');

      const users = await User.find({
        prayerNotifications: true,
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      for (const user of users) {
        // Get user's latest location
        const latestPrayerTime = await PrayerTime.findOne({
          userId: new mongoose.Types.ObjectId(user.id),
        }).sort({ createdAt: -1 });

        if (!latestPrayerTime) continue;

        try {
          // Fetch tomorrow's prayer times
          const response = await axios.get(`${ALADHAN_API}/timings/${dateStr}`, {
            params: {
              latitude: latestPrayerTime.latitude,
              longitude: latestPrayerTime.longitude,
              method: latestPrayerTime.method,
              school: latestPrayerTime.school,
            },
          });

          const data = response.data.data;

          // Save tomorrow's prayer times
          await PrayerTime.create({
            userId: new mongoose.Types.ObjectId(user.id),
            latitude: latestPrayerTime.latitude,
            longitude: latestPrayerTime.longitude,
            city: latestPrayerTime.city,
            country: latestPrayerTime.country,
            method: latestPrayerTime.method,
            school: latestPrayerTime.school,
            date: tomorrow,
            timings: data.timings,
          });

          logger.info(`Updated prayer times for user ${user.id}`);
        } catch (error) {
          logger.error(`Failed to update prayer times for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Prayer times update cron error:', error);
    }
  });

  logger.info('Prayer times update cron job started');
};

// Start all cron jobs
export const startAllCronJobs = () => {
  startPrayerReminderCron();
  startMorningReminderCron();
  startEveningReminderCron();
  startPrayerTimesUpdateCron();
  logger.info('All cron jobs started');
};

