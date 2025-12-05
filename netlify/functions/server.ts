import serverless from 'serverless-http';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { connectDatabases } from '../../src/config/database';
import { initializeFirebase } from '../../src/services/notificationService';
import { initializePinecone } from '../../src/services/aiService';
import routes from '../../src/routes';
import { errorHandler, notFound } from '../../src/middleware/errorHandler';
import { apiLimiter } from '../../src/middleware/rateLimiter';
import logger from '../../src/utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const API_VERSION = process.env.API_VERSION || 'v1';

// Trust proxy - Required for Netlify to get correct IP addresses
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

// Initialize services (only once, reuse connections)
let initialized = false;

const initializeServices = async () => {
  if (initialized) {
    return;
  }

  try {
    // Connect to databases
    await connectDatabases();
    logger.info('All databases connected');

    // Initialize Firebase for push notifications
    initializeFirebase();

    // Initialize Pinecone for AI search
    await initializePinecone();

    initialized = true;
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    // Don't throw - allow function to still work without some services
  }
};

// Initialize services on cold start
initializeServices();

// Export the serverless handler
export const handler = serverless(app, {
  binary: ['image/*', 'audio/*', 'application/pdf'],
});

