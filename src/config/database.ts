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
    
    await mongoose.connect(mongoUri);
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
    
    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Don't throw - Redis is optional for caching
    // Allow the app to continue without Redis
  }
};

// Connect all databases
export const connectDatabases = async (): Promise<void> => {
  // Connect MongoDB (required) - will throw if fails
  await connectMongoDB();
  
  // Connect Redis (optional) - won't throw if fails
  await connectRedis();
};

