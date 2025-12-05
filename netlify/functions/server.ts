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

// Initialize services (only once, reuse connections)
let initialized = false;
let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;

const initializeServices = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization with timeout
  initializationPromise = (async () => {
    try {
      logger.info('Starting service initialization...');
      
      // Set a timeout for initialization (10 seconds)
      const initTimeout = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), 10000);
      });

      await Promise.race([
        (async () => {
          // Connect to databases
          await connectDatabases();
          logger.info('All databases connected');

          // Initialize Firebase for push notifications
          initializeFirebase();

          // Initialize Pinecone for AI search
          await initializePinecone();
        })(),
        initTimeout,
      ]);

      initialized = true;
      initializationError = null;
      logger.info('Services initialized successfully');
    } catch (error) {
      initializationError = error as Error;
      logger.error('Failed to initialize services:', error);
      // Don't throw - allow function to still work without some services
      // Mark as initialized anyway to prevent retry loops
      initialized = true;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Middleware to ensure services are initialized before handling requests
const ensureInitialized = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Wait for initialization to complete
  try {
    await initializeServices();
    
    // If there was an initialization error, log it but continue
    if (initializationError) {
      logger.warn('Request proceeding despite initialization errors');
    }
    
    next();
  } catch (error) {
    logger.error('Initialization check failed:', error);
    // Still proceed - some endpoints might work without all services
    next();
  }
};

// Apply initialization check before rate limiting and routes
app.use(ensureInitialized);

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

// Export the serverless handler
export const handler = serverless(app, {
  binary: ['image/*', 'audio/*', 'application/pdf'],
});

