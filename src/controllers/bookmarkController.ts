import { Response } from 'express';
import Bookmark from '../models/mongodb/Bookmark';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { getAyah } from '../services/quranApiService';
import { getHadithById as getHadithByIdFromApi } from '../services/hadithApiService';
import Dua from '../models/mongodb/Dua';

export const createBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contentType, contentId, note } = req.body;

    if (!contentType || !contentId) {
      res.status(400).json({
        success: false,
        message: 'Content type and content ID are required',
      });
      return;
    }

    // Validate content exists before creating bookmark
    try {
      if (contentType === 'quran') {
        // Validate Quran reference (format: surah:ayah or ayahNumber)
        const ayah = await getAyah(contentId);
        if (!ayah) {
          res.status(404).json({
            success: false,
            message: 'Quran ayah not found',
          });
      return;
        }
      } else if (contentType === 'hadith') {
        // Validate Hadith ID
        const hadithId = parseInt(contentId);
        if (isNaN(hadithId)) {
          res.status(400).json({
            success: false,
            message: 'Invalid hadith ID',
          });
      return;
        }
        const hadith = await getHadithByIdFromApi(hadithId);
        if (!hadith) {
          res.status(404).json({
            success: false,
            message: 'Hadith not found',
          });
      return;
        }
      } else if (contentType === 'dua') {
        // Validate Dua exists in MongoDB
        const dua = await Dua.findById(contentId);
        if (!dua) {
          res.status(404).json({
            success: false,
            message: 'Dua not found',
          });
      return;
        }
      }
    } catch (error) {
      logger.error('Content validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating content',
      });
      return;
    }

    // Check if bookmark already exists
    const userId = req.user.id;
    const existingBookmark = await Bookmark.findOne({
      userId,
      contentType,
      contentId,
    });

    if (existingBookmark) {
      res.status(400).json({
        success: false,
        message: 'Bookmark already exists',
      });
      return;
    }

    const bookmark = await Bookmark.create({
      userId,
      contentType,
      contentId,
      note,
    });

    res.status(201).json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    logger.error('Create bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Helper function to fetch content for a bookmark
const fetchBookmarkContent = async (contentType: string, contentId: string) => {
  try {
    if (contentType === 'quran') {
      // Fetch from Quran API
      const ayah = await getAyah(contentId);
      if (ayah) {
        return {
          type: 'quran',
          data: ayah,
        };
      }
    } else if (contentType === 'hadith') {
      // Fetch from Hadith API
      const hadithId = parseInt(contentId);
      if (!isNaN(hadithId)) {
        const hadith = await getHadithByIdFromApi(hadithId);
        if (hadith) {
          // Import transformHadith here to avoid circular dependency
          const { transformHadith } = await import('../services/hadithApiService');
          return {
            type: 'hadith',
            data: transformHadith(hadith),
          };
        }
      }
    } else if (contentType === 'dua') {
      // Fetch from MongoDB
      const dua = await Dua.findById(contentId);
      if (dua) {
        return {
          type: 'dua',
          data: dua,
        };
      }
    }
    return null;
  } catch (error) {
    logger.error(`Error fetching content for bookmark ${contentType}:${contentId}:`, error);
    return null;
  }
};

export const getBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contentType, page = 1, limit = 20, includeContent = 'false' } = req.query;

    const query: any = { userId: req.user.id };
    if (contentType) query.contentType = contentType;

    const skip = (Number(page) - 1) * Number(limit);
    
    const [bookmarks, total] = await Promise.all([
      Bookmark.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip),
      Bookmark.countDocuments(query),
    ]);

    // If includeContent is true, fetch actual content from APIs
    let bookmarksWithContent: any[] = bookmarks;
    if (includeContent === 'true') {
      bookmarksWithContent = await Promise.all(
        bookmarks.map(async (bookmark) => {
          const content = await fetchBookmarkContent(bookmark.contentType, bookmark.contentId);
          return {
            ...bookmark.toObject(),
            content: content?.data || null,
          };
        })
      );
    }

    res.status(200).json({
      success: true,
      data: bookmarksWithContent,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const getBookmarkById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { includeContent = 'true' } = req.query;

    const bookmark = await Bookmark.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!bookmark) {
      res.status(404).json({
        success: false,
        message: 'Bookmark not found',
      });
      return;
    }

    let responseData: any = bookmark.toObject();

    // Fetch actual content if requested
    if (includeContent === 'true') {
      const content = await fetchBookmarkContent(bookmark.contentType, bookmark.contentId);
      responseData.content = content?.data || null;
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Get bookmark by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const updateBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const bookmark = await Bookmark.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!bookmark) {
      res.status(404).json({
        success: false,
        message: 'Bookmark not found',
      });
      return;
    }

    bookmark.note = note;
    await bookmark.save();

    res.status(200).json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    logger.error('Update bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const deleteBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bookmark = await Bookmark.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!bookmark) {
      res.status(404).json({
        success: false,
        message: 'Bookmark not found',
      });
      return;
    }

    await bookmark.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Bookmark deleted successfully',
    });
  } catch (error) {
    logger.error('Delete bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const checkBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contentType, contentId } = req.query;

    if (!contentType || !contentId) {
      res.status(400).json({
        success: false,
        message: 'Content type and content ID are required',
      });
      return;
    }

    const bookmark = await Bookmark.findOne({
      userId: req.user.id,
      contentType: contentType as string,
      contentId: contentId as string,
    });

    res.status(200).json({
      success: true,
      data: {
        isBookmarked: !!bookmark,
        bookmark: bookmark || null,
      },
    });
  } catch (error) {
    logger.error('Check bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
