/**
 * Generate a random 4-digit OTP code
 * @returns Random OTP string (4 digits, e.g., 1001, 4057)
 */
export const generateOtp = (): string => {
  // For development, you can use a fixed OTP from env
  if (process.env.NODE_ENV === 'development' && process.env.DEV_OTP) {
    return process.env.DEV_OTP;
  }

  // Generate random 4-digit OTP (1000-9999)
  const min = 1000;
  const max = 9999;
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  return otp.toString();
};

/**
 * Get OTP expiry time (default: 30 minutes)
 * @param minutes - Minutes until expiry (default: 30)
 * @returns Date object for expiry
 */
export const getOtpExpiry = (minutes: number = 30): Date => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

