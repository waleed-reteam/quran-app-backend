import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/mongodb/User';
import logger from '../utils/logger';
import { ensureMongoDBConnected } from '../config/database';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
      return;
    }

    try {
      // Ensure MongoDB is connected
      const isConnected = await ensureMongoDBConnected();
      if (!isConnected) {
        res.status(503).json({
          success: false,
          message: 'Database connection unavailable. Please try again later.',
        });
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { id: string };

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Add id property for compatibility (maps to _id)
      req.user = { ...user.toObject(), id: user.id };
      next();
    } catch (error: any) {
      // Check for MongoDB connection errors
      if (error.name === 'MongoServerError' || error.name === 'MongooseError' || error.message?.includes('connection')) {
        res.status(503).json({
          success: false,
          message: 'Database connection error. Please try again later.',
        });
        return;
      }
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
      return;
    }
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    // Check for MongoDB connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongooseError' || error.message?.includes('connection')) {
      res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again later.',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
    return;
  }
};

export const optional = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        // Ensure MongoDB is connected (but don't fail if not - this is optional auth)
        const isConnected = await ensureMongoDBConnected();
        if (isConnected) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { id: string };
          const user = await User.findById(decoded.id).select('-password');
          if (user) {
            // Add id property for compatibility (maps to _id)
            req.user = { ...user.toObject(), id: user.id };
          }
        }
      } catch (error) {
        // Token invalid or DB not available, but that's okay for optional auth
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

