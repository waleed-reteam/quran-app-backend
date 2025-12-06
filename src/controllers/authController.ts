import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/mongodb/User';
import Otp, { OtpType, IdentifierType } from '../models/mongodb/Otp';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOtp, getOtpExpiry } from '../utils/otp';
import { sendSignupEmail, sendForgotPasswordEmail } from '../services/emailService';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import {
  UserNotFoundException,
  InvalidOtpException,
  OtpExpiredException,
  UserAccountAlreadyExistsException,
  InvalidCredentialException,
  UserIdentifierNotVerifiedException,
  OldAndNewPasswordSameException,
  ValidationException,
  InvalidTokenException,
} from '../exceptions/AuthException';

// Get user verification OTP (resend OTP for unverified users)
export const getUserVerificationOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw new UserNotFoundException('User account not found. Please register first.');
    }

    // Check if user is already verified
    if (existingUser.isEmailVerified) {
      throw new UserAccountAlreadyExistsException(
        'User account is already verified'
      );
    }

    // Delete existing OTP if any
    await Otp.deleteMany({
      identifier: email,
      type: OtpType.VERIFY_ACCOUNT_OTP,
      is_verified: false,
    });

    // Generate new OTP
    const otpCode = generateOtp();
    const expiresAt = getOtpExpiry(30); // 30 minutes

    // Create OTP record
    const newOtp = new Otp({
      type: OtpType.VERIFY_ACCOUNT_OTP,
      code: otpCode,
      identifier: email,
      identifier_type: IdentifierType.EMAIL,
      expires_at: expiresAt,
      is_verified: false,
    });

    await newOtp.save();

    // Send OTP email
    await sendSignupEmail({
      toEmail: email,
      name: existingUser.name || 'User',
      heading: 'Account Verification',
      otp: otpCode,
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
    });
  } catch (error: any) {
    logger.error('Get user verification OTP error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof UserAccountAlreadyExistsException ||
      error instanceof UserNotFoundException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Verify account (verify OTP during signup)
export const verifyAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email, otp: otpCode } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new UserNotFoundException('User account not found');
    }

    // Find OTP
    const otp = await Otp.findOne({
      identifier: email,
      type: OtpType.VERIFY_ACCOUNT_OTP,
      is_verified: false,
    });

    if (!otp || otp.code !== otpCode) {
      throw new InvalidOtpException('Invalid OTP');
    }

    if (otp.isExpired()) {
      throw new OtpExpiredException('OTP has expired');
    }

    // Mark OTP as verified
    otp.is_verified = true;
    await otp.save();

    // Mark user email as verified
    user.isEmailVerified = true;
    await user.save();

    // Delete the OTP after successful verification
    await Otp.deleteOne({ _id: otp._id });

    res.status(200).json({
      success: true,
      message: 'Account verified successfully. You can now login.',
    });
  } catch (error: any) {
    logger.error('Verify account error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof UserNotFoundException ||
      error instanceof InvalidOtpException ||
      error instanceof OtpExpiredException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Register user (creates user and sends OTP)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new UserAccountAlreadyExistsException('User already exists');
    }

    // Create user with unverified email
    await User.create({
      email,
      password,
      name,
      authProvider: 'local',
      isEmailVerified: false, // Will be verified after OTP verification
    });

    // Delete existing OTP if any
    await Otp.deleteMany({
      identifier: email,
      type: OtpType.VERIFY_ACCOUNT_OTP,
      is_verified: false,
    });

    // Generate new OTP
    const otpCode = generateOtp();
    const expiresAt = getOtpExpiry(30); // 30 minutes

    // Create OTP record
    const newOtp = new Otp({
      type: OtpType.VERIFY_ACCOUNT_OTP,
      code: otpCode,
      identifier: email,
      identifier_type: IdentifierType.EMAIL,
      expires_at: expiresAt,
      is_verified: false,
    });

    await newOtp.save();

    // Send OTP email
    await sendSignupEmail({
      toEmail: email,
      name: name,
      heading: 'Account Verification',
      otp: otpCode,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to your email. Please verify your account.',
    });
  } catch (error: any) {
    logger.error('Register error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof UserAccountAlreadyExistsException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new InvalidCredentialException('Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new InvalidCredentialException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UserIdentifierNotVerifiedException(
        'Please verify your email first by entering the OTP'
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof InvalidCredentialException ||
      error instanceof UserIdentifierNotVerifiedException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Google Auth (keep existing functionality)
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, profilePicture, providerId } = req.body;
    // Note: idToken is available in req.body but not used yet
    // In production, verify the idToken with Google
    // For now, we'll trust the client

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name,
        profilePicture,
        authProvider: 'google',
        providerId,
        isEmailVerified: true, // Google accounts are pre-verified
      });
    } else if (user.authProvider !== 'google') {
      res.status(400).json({
        success: false,
        message: 'Email already registered with different provider',
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Apple Auth (keep existing functionality)
export const appleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, providerId } = req.body;
    // Note: identityToken is available in req.body but not used yet
    // In production, verify the identityToken with Apple
    // For now, we'll trust the client

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name: name || 'Apple User',
        authProvider: 'apple',
        providerId,
        isEmailVerified: true, // Apple accounts are pre-verified
      });
    } else if (user.authProvider !== 'apple') {
      res.status(400).json({
        success: false,
        message: 'Email already registered with different provider',
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Apple auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

// Get current user
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Update profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, language, timezone, prayerNotifications, reminderSettings } =
      req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (name) user.name = name;
    if (language) user.language = language;
    if (timezone) user.timezone = timezone;
    if (typeof prayerNotifications !== 'undefined')
      user.prayerNotifications = prayerNotifications;
    if (reminderSettings) user.reminderSettings = reminderSettings as any;

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Update FCM token
export const updateFCMToken = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { fcmToken } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    user.fcmToken = fcmToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'FCM token updated',
    });
  } catch (error) {
    logger.error('Update FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Forgot password - send OTP
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('name email');
    if (!user) {
      throw new UserNotFoundException('User account not found');
    }

    // Delete existing OTP if any
    await Otp.deleteMany({
      identifier: user.id,
      identifier_type: IdentifierType.USERID,
      type: OtpType.RESET_PASSWORD,
      is_verified: false,
    });

    // Generate new OTP
    const otpCode = generateOtp();
    const expiresAt = getOtpExpiry(30); // 30 minutes

    // Create OTP record
    const newOtp = new Otp({
      type: OtpType.RESET_PASSWORD,
      code: otpCode,
      identifier: user.id,
      identifier_type: IdentifierType.USERID,
      expires_at: expiresAt,
      is_verified: false,
    });

    await newOtp.save();

    // Send OTP email
    await sendForgotPasswordEmail({
      toEmail: user.email,
      name: user.name,
      heading: 'Reset Password',
      otp: otpCode,
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
    });
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof UserNotFoundException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Verify forgot password OTP
export const verifyForgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email, otp: otpCode } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new UserNotFoundException('User account not found');
    }

    // Find OTP
    const otp = await Otp.findOne({
      identifier: user.id,
      identifier_type: IdentifierType.USERID,
      type: OtpType.RESET_PASSWORD,
      is_verified: false,
    });

    if (!otp || otp.code !== otpCode) {
      throw new InvalidOtpException('Invalid OTP');
    }

    if (otp.isExpired()) {
      throw new OtpExpiredException('OTP has expired');
    }

    // Mark OTP as verified
    otp.is_verified = true;
    await otp.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error: any) {
    logger.error('Verify forgot password error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof UserNotFoundException ||
      error instanceof InvalidOtpException ||
      error instanceof OtpExpiredException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }

    const { email, password, otp: otpCode } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UserNotFoundException('User account not found');
    }

    // Verify OTP
    const otp = await Otp.findOne({
      identifier: user.id,
      identifier_type: IdentifierType.USERID,
      type: OtpType.RESET_PASSWORD,
      is_verified: true,
    });

    if (!otp || otp.code !== otpCode) {
      throw new InvalidOtpException('Invalid OTP');
    }

    if (otp.isExpired()) {
      throw new OtpExpiredException('OTP has expired');
    }

    // Check if new password is same as old password
    if (user.password) {
      const isSamePassword = await user.comparePassword(password);
      if (isSamePassword) {
        throw new OldAndNewPasswordSameException(
          'New password cannot be the same as old password'
        );
      }
    }

    // Update password
    user.password = password;
    await user.save();

    // Delete OTP
    await Otp.deleteOne({ _id: otp._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);
    if (
      error instanceof ValidationException ||
      error instanceof UserNotFoundException ||
      error instanceof InvalidOtpException ||
      error instanceof OtpExpiredException ||
      error instanceof OldAndNewPasswordSameException
    ) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        ...(error instanceof ValidationException && { errors: error.errors }),
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Logout
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Extract token from request headers
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new InvalidTokenException('No token provided');
    }

    // In a production app, you might want to blacklist the token
    // For now, we'll just return success
    // You can implement token blacklisting using Redis or a database

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    if (error instanceof InvalidTokenException) {
      res.status(error.status).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
