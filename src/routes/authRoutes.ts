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
  getUserVerificationOtp,
  verifyAccount,
  forgotPassword,
  verifyForgotPassword,
  resetPassword,
  logout,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import {
  signupValidator,
  getUserVerificationOtpValidator,
  verifyAccountValidator,
  signinValidator,
  forgotPasswordValidator,
  verifyForgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/authValidator';

const router = express.Router();

// Public routes
router.post('/get-verification-otp', getUserVerificationOtpValidator, getUserVerificationOtp);
router.post('/verify-account', verifyAccountValidator, verifyAccount);
router.post('/register', signupValidator, register);
router.post('/login', signinValidator, login);
router.post('/google', googleAuth);
router.post('/apple', appleAuth);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/verify-forgot-password', verifyForgotPasswordValidator, verifyForgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/fcm-token', protect, updateFCMToken);

export default router;

