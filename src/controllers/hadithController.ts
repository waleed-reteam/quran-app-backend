import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  getBooks,
  getChaptersByBook,
  getHadiths,
  getHadithById as getHadithByIdFromApi,
  transformHadith,
  getChapterNameBySequentialId,
} from '../services/hadithApiService';

export const getAllCollections = async (_req: Request, res: Response): Promise<void> => {
  try {
    const books = await getBooks();
    
    // Transform to collection format
    const collections = books.map(book => ({
      id: book.id,
      name: book.bookName,
      slug: book.bookSlug,
      writer: book.writerName,
      writerDeath: book.writerDeath,
      hadithsCount: parseInt(book.hadiths_count) || 0,
      chaptersCount: parseInt(book.chapters_count) || 0,
    }));

    res.status(200).json({
      success: true,
      data: collections,
    });
  } catch (error) {
    logger.error('Get all collections error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getHadithsByCollection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection } = req.params;
    const { page = 1, limit = 25 } = req.query;

    const result = await getHadiths({
      book: collection,
      paginate: Number(limit),
      page: Number(page),
    });

    const transformedHadiths = result.hadiths.map(transformHadith);

    res.status(200).json({
      success: true,
      data: transformedHadiths,
      pagination: {
        page: result.pagination.current_page,
        limit: result.pagination.per_page,
        total: result.pagination.total,
        pages: result.pagination.last_page,
        from: result.pagination.from,
        to: result.pagination.to,
      },
    });
  } catch (error) {
    logger.error('Get hadiths by collection error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getHadithById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const hadith = await getHadithByIdFromApi(parseInt(id));

    if (!hadith) {
      res.status(404).json({
        success: false,
        message: 'Hadith not found',
      });
      return;
    }

    const transformedHadith = transformHadith(hadith);

    res.status(200).json({
      success: true,
      data: transformedHadith,
    });
  } catch (error) {
    logger.error('Get hadith by id error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const searchHadiths = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      query,
      collection,
      language = 'en',
      page = 1,
      limit = 25,
      status,
      chapter,
      hadithNumber,
    } = req.query;

    if (!query && !hadithNumber && !chapter) {
      res.status(400).json({
        success: false,
        message: 'Search query, hadith number, or chapter is required',
      });
      return;
    }

    const filters: {
      paginate: number;
      page: number;
      book?: string;
      status?: 'Sahih' | 'Hasan' | "Da`eef";
      chapter?: string;
      hadithNumber?: string;
      hadithEnglish?: string;
      hadithUrdu?: string;
      hadithArabic?: string;
    } = {
      paginate: Number(limit),
      page: Number(page),
    };

    if (collection) filters.book = collection as string;
    if (status) filters.status = status as 'Sahih' | 'Hasan' | "Da`eef";
    if (chapter) filters.chapter = chapter as string;
    if (hadithNumber) filters.hadithNumber = hadithNumber as string;

    // Text search based on language
    if (query) {
      if (language === 'ar') {
        filters.hadithArabic = query as string;
      } else if (language === 'ur') {
        filters.hadithUrdu = query as string;
      } else {
        filters.hadithEnglish = query as string;
      }
    }

    const result = await getHadiths(filters);
    const transformedHadiths = result.hadiths.map(transformHadith);

    res.status(200).json({
      success: true,
      data: transformedHadiths,
      pagination: {
        page: result.pagination.current_page,
        limit: result.pagination.per_page,
        total: result.pagination.total,
        pages: result.pagination.last_page,
        from: result.pagination.from,
        to: result.pagination.to,
      },
    });
  } catch (error) {
    logger.error('Search hadiths error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getChapters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookSlug } = req.params;
    const { paginate, page } = req.query;

    const result = await getChaptersByBook(
      bookSlug,
      paginate ? Number(paginate) : undefined,
      page ? Number(page) : undefined
    );

    const transformedChapters = result.chapters.map(chapter => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      chapterEnglish: chapter.chapterEnglish,
      chapterUrdu: chapter.chapterUrdu,
      chapterArabic: chapter.chapterArabic,
      bookSlug: chapter.bookSlug,
    }));

    res.status(200).json({
      success: true,
      data: transformedChapters,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get chapters error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getHadithsByChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookSlug, chapterNumber } = req.params;
    const { page = 1, limit = 25 } = req.query;

    // Convert chapterNumber (sequential ID) to chapter name
    const sequentialId = parseInt(chapterNumber);
    if (isNaN(sequentialId) || sequentialId < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid chapter number',
      });
      return;
    }

    const chapterName = await getChapterNameBySequentialId(bookSlug, sequentialId);
    if (!chapterName) {
      res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
      return;
    }

    const result = await getHadiths({
      book: bookSlug,
      chapter: chapterName,
      paginate: Number(limit),
      page: Number(page),
    });

    const transformedHadiths = result.hadiths.map(transformHadith);

    res.status(200).json({
      success: true,
      data: transformedHadiths,
      pagination: {
        page: result.pagination.current_page,
        limit: result.pagination.per_page,
        total: result.pagination.total,
        pages: result.pagination.last_page,
        from: result.pagination.from,
        to: result.pagination.to,
      },
    });
  } catch (error) {
    logger.error('Get hadiths by chapter error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

