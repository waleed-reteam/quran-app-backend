import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Custom key generator that handles undefined IPs gracefully
// This is important for serverless environments like Netlify
const keyGenerator = (req: Request): string => {
  // Try multiple methods to get IP address
  // req.ip works when trust proxy is set correctly
  // req.socket.remoteAddress is a fallback
  // For serverless, we might need to check headers directly
  const ip = 
    req.ip || 
    req.socket.remoteAddress || 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] as string ||
    'unknown';
  return ip;
};

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  // Disable strict validation for serverless environments
  // This prevents errors when IP cannot be determined
  validate: {
    ip: false, // Disable IP validation to prevent ERR_ERL_UNDEFINED_IP_ADDRESS
    xForwardedForHeader: false, // Disable X-Forwarded-For validation
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
  keyGenerator,
  // Disable strict validation for serverless environments
  validate: {
    ip: false, // Disable IP validation to prevent ERR_ERL_UNDEFINED_IP_ADDRESS
    xForwardedForHeader: false, // Disable X-Forwarded-For validation
  },
});

