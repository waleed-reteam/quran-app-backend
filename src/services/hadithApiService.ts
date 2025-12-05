import axios from 'axios';
import logger from '../utils/logger';
import { redisGet, redisSet } from '../config/database';
import Hadith from '../models/mongodb/Hadith';

const HADITH_API_BASE = 'https://hadithapi.com/api';
const HADITH_API_KEY = process.env.HADITH_API_KEY || '$2y$10$unZvEIUjLokiEp5auSAYpe6uqmglNe17sOkYbSi62ibUEqVdPNyS';

interface HadithApiBook {
  id: number;
  bookName: string;
  writerName: string;
  aboutWriter: string | null;
  writerDeath: string;
  bookSlug: string;
  hadiths_count: string;
  chapters_count: string;
}

interface HadithApiChapter {
  id: number;
  chapterNumber: string;
  chapterEnglish: string;
  chapterUrdu: string;
  chapterArabic: string;
  bookSlug: string;
}

interface HadithApiHadith {
  id: number;
  hadithNumber: string;
  englishNarrator: string;
  hadithEnglish: string;
  hadithUrdu: string;
  hadithArabic: string;
  headingUrdu: string;
  headingEnglish: string;
  chapterId: string;
  bookSlug: string;
  volume: string;
  status: string;
  book: HadithApiBook;
  chapter: HadithApiChapter;
}

interface HadithApiResponse {
  status: number;
  message: string;
  [key: string]: unknown;
}

interface HadithPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Helper to transform MongoDB hadith to API format
const transformHadithToApiFormat = (hadith: { _id?: { toString: () => string } | unknown; hadithNumber: string; narrator?: string; englishText: string; urduText?: string; arabicText: string; chapterNumber?: number; collectionName: string; bookNumber?: number; book: string; grade?: string; chapter: string }): HadithApiHadith => {
  return {
    id: hadith._id && typeof hadith._id === 'object' && 'toString' in hadith._id 
      ? parseInt(hadith._id.toString().slice(-8), 16) || 0 
      : 0, // Generate numeric ID from ObjectId
    hadithNumber: hadith.hadithNumber,
    englishNarrator: hadith.narrator || '',
    hadithEnglish: hadith.englishText,
    hadithUrdu: hadith.urduText || '',
    hadithArabic: hadith.arabicText,
    headingUrdu: '',
    headingEnglish: '',
    chapterId: hadith.chapterNumber?.toString() || '',
    bookSlug: hadith.collectionName,
    volume: '',
    status: hadith.grade || '',
    book: {
      id: hadith.bookNumber || 0,
      bookName: hadith.book,
      writerName: '',
      aboutWriter: null,
      writerDeath: '',
      bookSlug: hadith.collectionName,
      hadiths_count: '0',
      chapters_count: '0',
    },
    chapter: {
      id: hadith.chapterNumber || 0,
      chapterNumber: hadith.chapterNumber?.toString() || '',
      chapterEnglish: hadith.chapter,
      chapterUrdu: '',
      chapterArabic: '',
      bookSlug: hadith.collectionName,
    },
  };
};

// Get all books - with fallback
export const getBooks = async (): Promise<HadithApiBook[]> => {
  try {
    const cacheKey = 'hadith:books';
    
    // Check cache first
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<HadithApiResponse & { books: HadithApiBook[] }>(
        `${HADITH_API_BASE}/books`,
        {
          params: { apiKey: HADITH_API_KEY },
          timeout: 5000,
        }
      );

      if (response.data.status === 200 && response.data.books) {
        const books = response.data.books;
        
        // Cache for 24 hours (books don't change often)
        await redisSet(cacheKey, JSON.stringify(books), 86400);
        
        return books;
      }
    } catch (apiError) {
      logger.warn('Hadith API failed, falling back to database:', apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const collections = await Hadith.distinct('collectionName');
    const books: HadithApiBook[] = [];

    for (const collection of collections) {
      const hadithCount = await Hadith.countDocuments({ collectionName: collection });
      const bookInfo = await Hadith.findOne({ collectionName: collection });

      if (bookInfo) {
        books.push({
          id: bookInfo.bookNumber || 0,
          bookName: bookInfo.book,
          writerName: '',
          aboutWriter: null,
          writerDeath: '',
          bookSlug: collection,
          hadiths_count: hadithCount.toString(),
          chapters_count: '0',
        });
      }
    }

    if (books.length > 0) {
      await redisSet(cacheKey, JSON.stringify(books), 3600);
      logger.info(`Fetched ${books.length} books from database (fallback)`);
      return books;
    }

    throw new Error('Failed to fetch books from Hadith API and database is empty');
  } catch (error) {
    logger.error('Get books from Hadith API error:', error);
    throw error;
  }
};

// Get chapters by book slug - with fallback
export const getChaptersByBook = async (
  bookSlug: string,
  paginate?: number
): Promise<HadithApiChapter[]> => {
  try {
    const cacheKey = `hadith:chapters:${bookSlug}:${paginate || 'all'}`;
    
    // Check cache
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const params: Record<string, string | number> = { apiKey: HADITH_API_KEY };
      if (paginate) {
        params.paginate = paginate;
      }

      const response = await axios.get<HadithApiResponse & { chapters: HadithApiChapter[] }>(
        `${HADITH_API_BASE}/${bookSlug}/chapters`,
        { params, timeout: 5000 }
      );

      if (response.data.status === 200 && response.data.chapters) {
        const chapters = response.data.chapters;
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(chapters), 43200);
        
        return chapters;
      }
    } catch (apiError) {
      logger.warn(`Hadith API failed for chapters ${bookSlug}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const chapters = await Hadith.distinct('chapter', { collectionName: bookSlug });
    const transformedChapters: HadithApiChapter[] = chapters.map((chapter, index) => ({
      id: index + 1,
      chapterNumber: (index + 1).toString(),
      chapterEnglish: chapter,
      chapterUrdu: '',
      chapterArabic: '',
      bookSlug,
    }));

    if (transformedChapters.length > 0) {
      await redisSet(cacheKey, JSON.stringify(transformedChapters), 3600);
      logger.info(`Fetched ${transformedChapters.length} chapters from database (fallback)`);
      return transformedChapters;
    }

    return [];
  } catch (error) {
    logger.error(`Get chapters for ${bookSlug} error:`, error);
    return [];
  }
};

// Get hadiths with filters - with fallback
export const getHadiths = async (filters: {
  hadithEnglish?: string;
  hadithUrdu?: string;
  hadithArabic?: string;
  hadithNumber?: string;
  book?: string;
  chapter?: string;
  status?: 'Sahih' | 'Hasan' | "Da`eef";
  paginate?: number;
  page?: number;
}): Promise<{
  hadiths: HadithApiHadith[];
  pagination: HadithPagination;
}> => {
  try {
    const cacheKey = `hadith:search:${JSON.stringify(filters)}`;
    
    // Check cache (only for non-search queries)
    if (!filters.hadithEnglish && !filters.hadithUrdu && !filters.hadithArabic) {
      const cached = await redisGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Try API first
    try {
      const params: Record<string, string | number> = { apiKey: HADITH_API_KEY };
      if (filters.hadithEnglish) params.hadithEnglish = filters.hadithEnglish;
      if (filters.hadithUrdu) params.hadithUrdu = filters.hadithUrdu;
      if (filters.hadithArabic) params.hadithArabic = filters.hadithArabic;
      if (filters.hadithNumber) params.hadithNumber = filters.hadithNumber;
      if (filters.book) params.book = filters.book;
      if (filters.chapter) params.chapter = filters.chapter;
      if (filters.status) params.status = filters.status;
      if (filters.paginate) params.paginate = filters.paginate;
      if (filters.page) params.page = filters.page;

      type HadithsResponse = HadithApiResponse & {
        hadiths: {
          data: HadithApiHadith[];
          pagination: HadithPagination;
        };
      };
      const response = await axios.get<HadithsResponse>(
        `${HADITH_API_BASE}/hadiths/`,
        { params, timeout: 5000 }
      );

      if (response.data.status === 200 && response.data.hadiths) {
        const hadithsData = response.data.hadiths;
        const result = {
          hadiths: hadithsData.data || [],
          pagination: hadithsData.pagination || {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: hadithsData.data?.length || 0,
            from: 1,
            to: hadithsData.data?.length || 0,
          },
        };
        
        // Cache for 12 hours (only for non-search queries)
        if (!filters.hadithEnglish && !filters.hadithUrdu && !filters.hadithArabic) {
          await redisSet(cacheKey, JSON.stringify(result), 43200);
        }
        
        return result;
      }
    } catch (apiError) {
      logger.warn('Hadith API failed, falling back to database:', apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const query: Record<string, unknown> = {};

    if (filters.book) {
      query.collectionName = filters.book;
    }

    if (filters.chapter) {
      query.chapter = { $regex: filters.chapter, $options: 'i' };
    }

    if (filters.hadithNumber) {
      query.hadithNumber = filters.hadithNumber;
    }

    if (filters.status) {
      query.grade = filters.status;
    }

    if (filters.hadithEnglish) {
      query.englishText = { $regex: filters.hadithEnglish, $options: 'i' };
    }

    if (filters.hadithUrdu) {
      query.urduText = { $regex: filters.hadithUrdu, $options: 'i' };
    }

    if (filters.hadithArabic) {
      query.arabicText = { $regex: filters.hadithArabic, $options: 'i' };
    }

    const page = filters.page || 1;
    const perPage = filters.paginate || 25;
    const skip = (page - 1) * perPage;

    const [hadiths, total] = await Promise.all([
      Hadith.find(query)
        .sort({ hadithNumber: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      Hadith.countDocuments(query),
    ]);

    const transformedHadiths = hadiths.map(transformHadithToApiFormat);

    const result = {
      hadiths: transformedHadiths,
      pagination: {
        current_page: page,
        last_page: Math.ceil(total / perPage),
        per_page: perPage,
        total,
        from: skip + 1,
        to: Math.min(skip + perPage, total),
      },
    };

    // Cache for 1 hour (shorter cache for fallback data)
    if (!filters.hadithEnglish && !filters.hadithUrdu && !filters.hadithArabic) {
      await redisSet(cacheKey, JSON.stringify(result), 3600);
    }

    logger.info(`Fetched ${transformedHadiths.length} hadiths from database (fallback)`);
    return result;
  } catch (error) {
    logger.error('Get hadiths from Hadith API error:', error);
    throw error;
  }
};

// Get hadith by ID - with fallback
export const getHadithById = async (id: number): Promise<HadithApiHadith | null> => {
  try {
    const cacheKey = `hadith:id:${id}`;
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      // Try to get by ID first (if endpoint exists)
      try {
        const response = await axios.get<HadithApiResponse & { hadith: HadithApiHadith }>(
          `${HADITH_API_BASE}/hadiths/${id}`,
          { 
            params: { apiKey: HADITH_API_KEY },
            timeout: 5000,
          }
        );

        if (response.data.status === 200 && response.data.hadith) {
          const hadith = response.data.hadith;
          await redisSet(cacheKey, JSON.stringify(hadith), 86400);
          return hadith;
        }
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.debug(`Hadith ID endpoint not found, trying search for ID ${id}`);
        } else {
          throw error;
        }
      }

      // Fallback: Search for hadith by ID (treating ID as hadithNumber)
      const searchResult = await getHadiths({
        hadithNumber: id.toString(),
        paginate: 1,
      });

      if (searchResult.hadiths.length > 0) {
        const hadith = searchResult.hadiths[0];
        await redisSet(cacheKey, JSON.stringify(hadith), 86400);
        return hadith;
      }
    } catch (apiError) {
      logger.warn(`Hadith API failed for ID ${id}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    // Try to find by hadithNumber first (since API IDs might not match MongoDB IDs)
    const hadith = await Hadith.findOne({ hadithNumber: id.toString() });
    
    if (hadith) {
      const transformed = transformHadithToApiFormat(hadith);
      await redisSet(cacheKey, JSON.stringify(transformed), 86400);
      logger.info(`Fetched hadith ${id} from database (fallback)`);
      return transformed;
    }

    return null;
  } catch (error) {
    logger.error(`Get hadith by ID ${id} error:`, error);
    return null;
  }
};

// Transform Hadith API response to our format
export const transformHadith = (apiHadith: HadithApiHadith) => {
  return {
    id: apiHadith.id.toString(),
    hadithNumber: apiHadith.hadithNumber,
    collection: apiHadith.bookSlug,
    bookName: apiHadith.book.bookName,
    chapterId: apiHadith.chapterId,
    chapterNumber: apiHadith.chapter.chapterNumber,
    chapterEnglish: apiHadith.chapter.chapterEnglish,
    chapterUrdu: apiHadith.chapter.chapterUrdu,
    chapterArabic: apiHadith.chapter.chapterArabic,
    englishNarrator: apiHadith.englishNarrator,
    hadithEnglish: apiHadith.hadithEnglish,
    hadithUrdu: apiHadith.hadithUrdu,
    hadithArabic: apiHadith.hadithArabic,
    headingEnglish: apiHadith.headingEnglish,
    headingUrdu: apiHadith.headingUrdu,
    volume: apiHadith.volume,
    status: apiHadith.status,
    bookInfo: apiHadith.book,
    chapterInfo: apiHadith.chapter,
  };
};
