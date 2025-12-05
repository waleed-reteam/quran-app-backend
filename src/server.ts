import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { connectDatabases } from './config/database';
import { initializeFirebase } from './services/notificationService';
import { initializePinecone } from './services/aiService';
import { startAllCronJobs } from './services/cronService';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Trust proxy - Required when behind a proxy (e.g., Netlify, nginx, etc.)
app.set('trust proxy', true);

// Middleware
// Configure Helmet with CSP that allows Swagger UI resources
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      connectSrc: ["'self'", "https://unpkg.com", "https://taqwa-api.netlify.app"],
      fontSrc: ["'self'", "https://unpkg.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(`/api/${API_VERSION}`, apiLimiter);

// Routes
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Quran App Backend API',
    version: API_VERSION,
    documentation: `/api/${API_VERSION}/docs`,
    health: `/api/${API_VERSION}/health`,
  });
});

app.use(`/api/${API_VERSION}`, routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize services and start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabases();
    logger.info('All databases connected');

    // Initialize Firebase for push notifications
    initializeFirebase();

    // Initialize Pinecone for AI search
    await initializePinecone();

    // Start cron jobs for reminders
    if (process.env.NODE_ENV === 'production') {
      startAllCronJobs();
    } else {
      logger.info('Cron jobs disabled in development mode');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/${API_VERSION}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

