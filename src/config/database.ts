import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// MongoDB Connection
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quran_app';
    
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected');
      return;
    }
    
    // Set connection options for serverless environments
    const connectionOptions = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 5000, // 5 seconds connection timeout
      maxPoolSize: 1, // Reduce pool size for serverless
      minPoolSize: 0,
    };
    
    await mongoose.connect(mongoUri, connectionOptions);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Don't exit process in serverless environment - allow graceful degradation
    // Only exit in non-serverless environments (local development)
    if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
      process.exit(1);
    }
    throw error; // Re-throw to allow caller to handle
  }
};

// Redis Connection
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis connected successfully'));

export const connectRedis = async (): Promise<void> => {
  try {
    // Check if already connected
    if (redisClient.isOpen) {
      logger.info('Redis already connected');
      return;
    }
    
    // Set connection timeout for Redis
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 3000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Don't throw - Redis is optional for caching
    // Allow the app to continue without Redis
  }
};

// Connect all databases
export const connectDatabases = async (): Promise<void> => {
  // Connect MongoDB - handle errors gracefully in serverless
  try {
    await connectMongoDB();
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    // In serverless, don't throw - allow graceful degradation
    if (process.env.NETLIFY || process.env.NODE_ENV === 'production') {
      // Log but don't throw in production/serverless
      return;
    }
    throw error; // Throw in development
  }
  
  // Connect Redis (optional) - won't throw if fails
  await connectRedis();
};

