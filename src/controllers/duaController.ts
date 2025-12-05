import { Request, Response } from 'express';
import Dua from '../models/mongodb/Dua';
import logger from '../utils/logger';
import { redisGet, redisSet, ensureMongoDBConnected } from '../config/database';

export const getAllDuas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (category) query.category = category;

    const cacheKey = `duas:${category || 'all'}:${page}:${limit}`;
    const cached = await redisGet(cacheKey);
    
    if (cached) {
      res.status(200).json({
        success: true,
        ...JSON.parse(cached),
      });
      return;
    }

    // Ensure MongoDB is connected
    if (!(await ensureMongoDBConnected())) {
      res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const duas = await Dua.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Dua.countDocuments(query);

    const result = {
      data: duas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };

    // Cache for 1 hour
    await redisSet(cacheKey, JSON.stringify(result), 3600);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Get all duas error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getDuaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Ensure MongoDB is connected
    if (!(await ensureMongoDBConnected())) {
      res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
      return;
    }

    const dua = await Dua.findById(id);

    if (!dua) {
      res.status(404).json({
        success: false,
        message: 'Dua not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: dua,
    });
  } catch (error) {
    logger.error('Get dua by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getDuasByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    const cacheKey = `duas:category:${category}`;
    const cached = await redisGet(cacheKey);
    
    if (cached) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cached),
      });
      return;
    }

    // Ensure MongoDB is connected
    if (!(await ensureMongoDBConnected())) {
      res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
      });
      return;
    }

    const duas = await Dua.find({ category }).sort({ createdAt: -1 });

    // Cache for 1 hour
    await redisSet(cacheKey, JSON.stringify(duas), 3600);

    res.status(200).json({
      success: true,
      data: duas,
      count: duas.length,
    });
  } catch (error) {
    logger.error('Get duas by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const searchDuas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, category, language = 'en', page = 1, limit = 20 } = req.query;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query required',
      });
      return;
    }

    const searchQuery: any = {};
    
    if (category) {
      searchQuery.category = category;
    }

    // Text search based on language
    if (language === 'ar') {
      searchQuery.arabic = { $regex: query as string, $options: 'i' };
    } else {
      searchQuery.$or = [
        { title: { $regex: query as string, $options: 'i' } },
        { translation: { $regex: query as string, $options: 'i' } },
        { transliteration: { $regex: query as string, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const duas = await Dua.find(searchQuery)
      .skip(skip)
      .limit(Number(limit));

    const total = await Dua.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: duas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Search duas error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Dua.distinct('category');

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

