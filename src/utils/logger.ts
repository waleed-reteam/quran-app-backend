import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logLevel = process.env.LOG_LEVEL || 'info';

// Check if we're in a serverless environment (Netlify Functions, AWS Lambda, etc.)
// Netlify Functions run in /var/task directory (Lambda-like environment)
const isServerless = 
  !!process.env.NETLIFY || 
  !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
  !!process.env.VERCEL ||
  process.cwd().startsWith('/var/task') ||
  process.cwd().includes('/.netlify/');

const transports: winston.transport[] = [];

// Only add file transports if not in serverless environment and logs directory can be created
if (!isServerless) {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
      })
    );
  } catch (error) {
    // If we can't create logs directory, fall back to console only
    console.warn('Could not create logs directory, using console logging only');
  }
}

// Always add console transport for serverless environments or development
if (isServerless || process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
} else {
  // In production (non-serverless), also add console for important logs
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.simple()
      ),
      level: 'warn', // Only warnings and errors to console in production
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'quran-app-backend' },
  transports,
});

export default logger;

