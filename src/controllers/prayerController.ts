import { Request, Response } from 'express';
import axios from 'axios';
import PrayerTime from '../models/mongodb/PrayerTime';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { redisGet, redisSet, ensureMongoDBConnected } from '../config/database';

const ALADHAN_API = process.env.ALADHAN_API_URL || 'https://api.aladhan.com/v1';

export const getPrayerTimes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, date, method = 2, school = 0 } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const cacheKey = `prayer:${latitude}:${longitude}:${dateStr}:${method}:${school}`;
    
    // Check cache
    const cached = await redisGet(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
      return;
    }

    // Fetch from Aladhan API
    const response = await axios.get(`${ALADHAN_API}/timings/${dateStr}`, {
      params: {
        latitude,
        longitude,
        method,
        school,
      },
    });

    const data = response.data.data;

    // Save to database if user is authenticated
    if (req.user && await ensureMongoDBConnected()) {
      try {
        await PrayerTime.create({
          userId: req.user.id,
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
          city: data.meta.timezone || 'Unknown',
          country: 'Unknown',
          method: parseInt(method as string, 10),
          school: parseInt(school as string, 10),
          date: new Date(dateStr as string),
          timings: data.timings,
        });
      } catch (dbError) {
        logger.error('Failed to save prayer time to database:', dbError);
        // Continue even if database save fails
      }
    }

    const result = {
      date: data.date,
      timings: data.timings,
      meta: data.meta,
    };

    // Cache for 12 hours
    await redisSet(cacheKey, JSON.stringify(result), 43200);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get prayer times error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getPrayerTimesByCity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { city, country, date, method = 2, school = 0 } = req.query;

    if (!city || !country) {
      res.status(400).json({
        success: false,
        message: 'City and country are required',
      });
      return;
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const cacheKey = `prayer:city:${city}:${country}:${dateStr}:${method}:${school}`;
    
    // Check cache
    const cached = await redisGet(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
      return;
    }

    // Fetch from Aladhan API
    const response = await axios.get(`${ALADHAN_API}/timingsByCity/${dateStr}`, {
      params: {
        city,
        country,
        method,
        school,
      },
    });

    const data = response.data.data;

    const result = {
      date: data.date,
      timings: data.timings,
      meta: data.meta,
    };

    // Cache for 12 hours
    await redisSet(cacheKey, JSON.stringify(result), 43200);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get prayer times by city error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getMonthlyPrayerTimes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, month, year, method = 2, school = 0 } = req.query;

    if (!latitude || !longitude || !month || !year) {
      res.status(400).json({
        success: false,
        message: 'Latitude, longitude, month, and year are required',
      });
      return;
    }

    const cacheKey = `prayer:monthly:${latitude}:${longitude}:${month}:${year}:${method}:${school}`;
    
    // Check cache
    const cached = await redisGet(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
      return;
    }

    // Fetch from Aladhan API
    const response = await axios.get(`${ALADHAN_API}/calendar/${year}/${month}`, {
      params: {
        latitude,
        longitude,
        method,
        school,
      },
    });

    const data = response.data.data;

    // Cache for 24 hours
    await redisSet(cacheKey, JSON.stringify(data), 86400);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get monthly prayer times error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getNextPrayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, method = 2, school = 0 } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    
    // Fetch from Aladhan API
    const response = await axios.get(`${ALADHAN_API}/timings/${dateStr}`, {
      params: {
        latitude,
        longitude,
        method,
        school,
      },
    });

    const timings = response.data.data.timings;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;

    for (const prayer of prayers) {
      const [hours, minutes] = timings[prayer].split(':').map(Number);
      const prayerTime = hours * 60 + minutes;

      if (prayerTime > currentTime) {
        nextPrayer = {
          name: prayer,
          time: timings[prayer],
          minutesUntil: prayerTime - currentTime,
        };
        break;
      }
    }

    // If no prayer found today, next is Fajr tomorrow
    if (!nextPrayer) {
      const [hours, minutes] = timings.Fajr.split(':').map(Number);
      const minutesUntilMidnight = (24 * 60) - currentTime;
      const minutesAfterMidnight = hours * 60 + minutes;
      
      nextPrayer = {
        name: 'Fajr',
        time: timings.Fajr,
        minutesUntil: minutesUntilMidnight + minutesAfterMidnight,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        nextPrayer,
        allTimings: timings,
      },
    });
  } catch (error) {
    logger.error('Get next prayer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getQiblaDirection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
      return;
    }

    const cacheKey = `qibla:${latitude}:${longitude}`;
    
    // Check cache
    const cached = await redisGet(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
      });
      return;
    }

    // Fetch from Aladhan API
    const response = await axios.get(`${ALADHAN_API}/qibla/${latitude}/${longitude}`);

    const data = response.data.data;

    // Cache for 30 days (qibla doesn't change)
    await redisSet(cacheKey, JSON.stringify(data), 2592000);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Get qibla direction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

