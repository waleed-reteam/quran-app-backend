import express from 'express';
import {
  getPrayerTimes,
  getPrayerTimesByCity,
  getMonthlyPrayerTimes,
  getNextPrayer,
  getQiblaDirection,
} from '../controllers/prayerController';
import { optional } from '../middleware/auth';

const router = express.Router();

router.get('/times', optional, getPrayerTimes);
router.get('/times/city', optional, getPrayerTimesByCity);
router.get('/times/monthly', optional, getMonthlyPrayerTimes);
router.get('/next', getNextPrayer);
router.get('/qibla', getQiblaDirection);

export default router;

