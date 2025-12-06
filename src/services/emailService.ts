import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import ejs from 'ejs';

// Helper function to resolve template path (works in both local and Netlify environments)
const getTemplatePath = (templateName: string): string => {
  // Try multiple possible locations
  const possiblePaths = [
    // Standard build location (dist/views/emails/)
    path.join(__dirname, '../views/emails', templateName),
    // Netlify Functions location (from process.cwd())
    path.join(process.cwd(), 'dist', 'views', 'emails', templateName),
    // Alternative Netlify location
    path.join(process.cwd(), 'views', 'emails', templateName),
    // Source location (for development)
    path.join(process.cwd(), 'src', 'views', 'emails', templateName),
  ];

  // Return the first path that exists, or the first one as fallback
  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
  }

  // If none exist, return the standard path (will trigger fallback template)
  return possiblePaths[0];
};

// Email configuration
const emailConfig = {
  service: process.env.MAIL_SERVICE || 'gmail',
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASSWORD || '',
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: emailConfig.service,
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
  });
};

// Send signup verification email
export const sendSignupEmail = async (data: {
  toEmail: string;
  name: string;
  heading: string;
  otp: string;
}): Promise<void> => {
  try {
    const { toEmail, name, heading, otp } = data;

    // Read email template
    const templatePath = getTemplatePath('signup.ejs');
    let htmlTemplate: string;

    try {
      htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
      logger.info(`Signup email template loaded from: ${templatePath}`);
    } catch (error) {
      // Log the error for debugging
      logger.warn(`Failed to load signup email template from ${templatePath}:`, error);
      logger.warn(`Current working directory: ${process.cwd()}`);
      logger.warn(`__dirname: ${__dirname}`);
      // If template doesn't exist, use a simple HTML template
      htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${heading}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">${heading}</h2>
            <p>Hello ${name},</p>
            <p>Thank you for registering with us. Please use the following OTP to verify your account:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 30 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>Quran App Team</p>
          </div>
        </body>
        </html>
      `;
    }

    const compiledHtml = ejs.render(htmlTemplate, { data: { name, otp } });

    const mailOptions = {
      from: emailConfig.auth.user,
      to: toEmail,
      subject: heading,
      html: compiledHtml,
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    logger.info(`Signup email sent to ${toEmail}`);
  } catch (error) {
    logger.error('Error sending signup email:', error);
    throw error;
  }
};

// Send OTP email (for various purposes)
export const sendOtpEmail = async (data: {
  toEmail: string;
  name: string;
  heading: string;
  otp: string;
  type?: string;
  message?: string;
}): Promise<void> => {
  try {
    const { toEmail, name, heading, otp, type, message } = data;

    // Get appropriate message based on OTP type
    let defaultMessage = 'Please use this OTP to complete your request.';
    if (message) {
      defaultMessage = message;
    } else {
      switch (type) {
        case 'phone-login':
          defaultMessage =
            'You are receiving this email because we received a login request for your account. Please enter the given token in your mobile application to login.';
          break;
        case 'primary-login':
          defaultMessage =
            'You are receiving this email because we received a primary login update request for your account. Please enter the given token in your mobile application to update your primary login information.';
          break;
        case 'recover-account':
          defaultMessage =
            'You are receiving this email because we received an account recovery request for your account. Please enter the given token in your mobile application to recover your account.';
          break;
        case 'reset-password':
          defaultMessage =
            'You are receiving this email because we received a password reset request for your account. Please enter the given token to reset your password.';
          break;
        default:
          defaultMessage = 'Please use this OTP to complete your request.';
      }
    }

    // Read email template
    const templatePath = getTemplatePath('otp.ejs');
    let htmlTemplate: string;

    try {
      htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
      logger.info(`OTP email template loaded from: ${templatePath}`);
    } catch (error) {
      // Log the error for debugging
      logger.warn(`Failed to load OTP email template from ${templatePath}:`, error);
      logger.warn(`Current working directory: ${process.cwd()}`);
      logger.warn(`__dirname: ${__dirname}`);
      // If template doesn't exist, use a simple HTML template
      htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${heading}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">${heading}</h2>
            <p>Hello ${name},</p>
            <p>${defaultMessage}</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 30 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>Quran App Team</p>
          </div>
        </body>
        </html>
      `;
    }

    const compiledHtml = ejs.render(htmlTemplate, {
      data: { name, otp, message: defaultMessage },
    });

    const mailOptions = {
      from: emailConfig.auth.user,
      to: toEmail,
      subject: heading,
      html: compiledHtml,
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${toEmail}`);
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    throw error;
  }
};

// Send forgot password email
export const sendForgotPasswordEmail = async (data: {
  toEmail: string;
  name: string;
  heading: string;
  otp: string;
}): Promise<void> => {
  try {
    const { toEmail, name, heading, otp } = data;

    // Read email template
    const templatePath = getTemplatePath('forgot-password.ejs');
    let htmlTemplate: string;

    try {
      htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
      logger.info(`Forgot password email template loaded from: ${templatePath}`);
    } catch (error) {
      // Log the error for debugging
      logger.warn(`Failed to load forgot password email template from ${templatePath}:`, error);
      logger.warn(`Current working directory: ${process.cwd()}`);
      logger.warn(`__dirname: ${__dirname}`);
      // If template doesn't exist, use a simple HTML template
      htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${heading}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">${heading}</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password. Please use the following OTP to reset your password:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 30 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>Quran App Team</p>
          </div>
        </body>
        </html>
      `;
    }

    const compiledHtml = ejs.render(htmlTemplate, { data: { name, otp } });

    const mailOptions = {
      from: emailConfig.auth.user,
      to: toEmail,
      subject: heading,
      html: compiledHtml,
    };

    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    logger.info(`Forgot password email sent to ${toEmail}`);
  } catch (error) {
    logger.error('Error sending forgot password email:', error);
    throw error;
  }
};

