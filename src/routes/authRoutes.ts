import express from 'express';
import {
  register,
  login,
  googleAuth,
  appleAuth,
  refreshToken,
  getMe,
  updateProfile,
  updateFCMToken,
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/apple', appleAuth);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/fcm-token', protect, updateFCMToken);

export default router;

