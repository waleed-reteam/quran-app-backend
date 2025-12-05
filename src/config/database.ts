import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// MongoDB Connection
let mongoConnecting = false;

export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quran_app';
    
    // Check if already connected (ConnectionStates.connected = 1)
    if ((mongoose.connection.readyState as number) === 1) {
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (mongoConnecting) {
      // Wait for existing connection attempt
      let attempts = 0;
      while (mongoConnecting && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        if ((mongoose.connection.readyState as number) === 1) {
          return;
        }
      }
    }
    
    mongoConnecting = true;
    
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
  } finally {
    mongoConnecting = false;
  }
};

// Helper function to ensure MongoDB is connected before use
export const ensureMongoDBConnected = async (): Promise<boolean> => {
  try {
    if ((mongoose.connection.readyState as number) === 1) {
      return true;
    }
    
    await connectMongoDB();
    return (mongoose.connection.readyState as number) === 1;
  } catch (error) {
    logger.error('MongoDB connection check failed:', error);
    return false;
  }
};

// Redis Connection
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    connectTimeout: 3000,
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        logger.warn('Redis reconnection attempts exceeded, giving up');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis connected successfully'));
redisClient.on('ready', () => logger.info('Redis ready'));
redisClient.on('reconnecting', () => logger.info('Redis reconnecting'));

let redisConnecting = false;

export const connectRedis = async (): Promise<void> => {
  try {
    // Check if already connected
    if (redisClient.isOpen) {
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (redisConnecting) {
      // Wait for existing connection attempt
      let attempts = 0;
      while (redisConnecting && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (redisClient.isOpen) {
        return;
      }
    }
    
    redisConnecting = true;
    
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
  } finally {
    redisConnecting = false;
  }
};

// Helper function to ensure Redis is connected before use
export const ensureRedisConnected = async (): Promise<boolean> => {
  try {
    if (redisClient.isOpen) {
      return true;
    }
    
    await connectRedis();
    return redisClient.isOpen;
  } catch (error) {
    logger.warn('Redis not available:', error);
    return false;
  }
};

// Safe Redis get operation
export const redisGet = async (key: string): Promise<string | null> => {
  try {
    if (await ensureRedisConnected()) {
      return await redisClient.get(key);
    }
  } catch (error) {
    logger.warn(`Redis GET error for key ${key}:`, error);
  }
  return null;
};

// Safe Redis set operation
export const redisSet = async (key: string, value: string, expirySeconds?: number): Promise<boolean> => {
  try {
    if (await ensureRedisConnected()) {
      if (expirySeconds) {
        await redisClient.setEx(key, expirySeconds, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    }
  } catch (error) {
    logger.warn(`Redis SET error for key ${key}:`, error);
  }
  return false;
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


