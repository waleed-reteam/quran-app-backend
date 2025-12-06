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
// CORS configuration - allows mobile apps (no origin) and specific web origins
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow requests from allowed origins
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
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

const initializeServices = async (skipWait: boolean = false): Promise<void> => {
  if (initialized) {
    return;
  }

  // If initialization is already in progress
  if (initializationPromise) {
    if (skipWait) {
      // Don't wait, just return immediately
      return;
    }
    // Wait for existing initialization
    try {
      await initializationPromise;
    } catch (error) {
      // Ignore errors if we're skipping wait
      if (!skipWait) throw error;
    }
    return;
  }

  // Start initialization with aggressive timeout (5 seconds)
  initializationPromise = (async () => {
    try {
      logger.info('Starting service initialization...');
      
      // Set a timeout for initialization (5 seconds - aggressive)
      const initTimeout = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), 5000);
      });

      await Promise.race([
        (async () => {
          // Connect to databases with individual timeouts
          try {
            await Promise.race([
              connectDatabases(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout')), 3000)
              )
            ]);
            logger.info('All databases connected');
          } catch (dbError) {
            logger.error('Database connection failed:', dbError);
            // Continue without databases - some endpoints might work
          }

          // Initialize Firebase for push notifications (non-blocking)
          try {
            initializeFirebase();
          } catch (firebaseError) {
            logger.error('Firebase initialization failed:', firebaseError);
          }

          // Initialize Pinecone for AI search (non-blocking)
          try {
            await Promise.race([
              initializePinecone(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Pinecone initialization timeout')), 2000)
              )
            ]);
          } catch (pineconeError) {
            logger.error('Pinecone initialization failed:', pineconeError);
          }
        })(),
        initTimeout,
      ]);

      initialized = true;
      initializationError = null;
      logger.info('Services initialized successfully');
    } catch (error) {
      initializationError = error as Error;
      logger.error('Failed to initialize services:', error);
      // Mark as initialized anyway to prevent retry loops
      initialized = true;
    } finally {
      initializationPromise = null;
    }
  })();

  // If skipWait is true, don't wait for initialization
  if (!skipWait) {
    return initializationPromise;
  }
};

// Start initialization in background (non-blocking)
initializeServices(true).catch(err => {
  logger.error('Background initialization error:', err);
});

// Middleware to ensure services are initialized before handling requests
// But with a short timeout to prevent blocking
const ensureInitialized = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only wait if initialization is in progress and we haven't timed out
  if (initializationPromise && !initialized) {
    try {
      // Wait max 3 seconds for initialization (increased from 2)
      await Promise.race([
        initializationPromise,
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
    } catch (error) {
      logger.warn('Initialization wait timeout, proceeding anyway');
    }
  }
  
  // If there was an initialization error, log it but continue
  // Individual endpoints will handle DB connection checks
  if (initializationError) {
    logger.warn('Request proceeding despite initialization errors - endpoints will handle DB connection');
  }
  
  next();
};

// Only apply initialization check to API routes, not root or health
app.use(`/api/${API_VERSION}`, ensureInitialized);

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

