import logger from '../utils/logger';
import { redisGet, redisSet } from '../config/database';
import Hadith, { IHadith } from '../models/mongodb/Hadith';
import fs from 'fs';
import path from 'path';

// Collection Display Names Mapping
const COLLECTION_NAMES: { [key: string]: string } = {
  'sahih-bukhari': 'Sahih al-Bukhari',
  'sahih-muslim': 'Sahih Muslim',
  'sunan-an-nasai': 'Sunan an-Nasa\'i',
  'sunan-abu-dawud': 'Sunan Abu Dawud',
  'jami-at-tirmidhi': 'Jami` at-Tirmidhi',
  'sunan-ibn-majah': 'Sunan Ibn Majah',
  'muwatta-malik': 'Muwatta Malik',
  'musnad-ahmad': 'Musnad Ahmad',
  'sunan-darimi': 'Sunan ad-Darimi',
  'riyadh-as-salihin': 'Riyad as-Salihin',
};

// Author information mapping (from JSON metadata)
interface AuthorInfo {
  writerName: string;
  writerDeath: string;
  aboutWriter: string | null;
}

// Static author information mapping based on JSON metadata
const AUTHOR_INFO: { [key: string]: AuthorInfo } = {
  'sahih-bukhari': {
    writerName: 'Imam Muhammad ibn Ismail al-Bukhari',
    writerDeath: '256 AH',
    aboutWriter: null,
  },
  'sahih-muslim': {
    writerName: 'Imam Muslim ibn al-Hajjaj al-Naysaburi',
    writerDeath: '261 AH',
    aboutWriter: null,
  },
  'sunan-an-nasai': {
    writerName: 'Imam Ahmad ibn Shu\'ayb al-Nasa\'i',
    writerDeath: '303 AH',
    aboutWriter: null,
  },
  'sunan-abu-dawud': {
    writerName: 'Imam Sulayman ibn al-Ash\'ath Abu Dawud al-Sijistani',
    writerDeath: '275 AH',
    aboutWriter: null,
  },
  'jami-at-tirmidhi': {
    writerName: 'Imam Abu Isa Muhammad ibn Isa al-Tirmidhi',
    writerDeath: '279 AH',
    aboutWriter: null,
  },
  'sunan-ibn-majah': {
    writerName: 'Imam Muhammad ibn Yazid Ibn Majah al-Qazwini',
    writerDeath: '273 AH',
    aboutWriter: null,
  },
  'muwatta-malik': {
    writerName: 'Imam Malik ibn Anas',
    writerDeath: '179 AH',
    aboutWriter: null,
  },
  'musnad-ahmad': {
    writerName: 'Imam Ahmad ibn Hanbal',
    writerDeath: '241 AH',
    aboutWriter: null,
  },
  'sunan-darimi': {
    writerName: 'Imam Abu Muhammad Abd al-Rahman ibn Abd Allah ibn al-Darimi',
    writerDeath: '255 AH',
    aboutWriter: null,
  },
  'riyadh-as-salihin': {
    writerName: 'Imam Abu Zakariya Yahya ibn Sharaf al-Nawawi',
    writerDeath: '676 AH',
    aboutWriter: null,
  },
};

// Helper function to get author info from JSON metadata (with fallback to static mapping)
const getAuthorInfo = (collectionName: string): AuthorInfo => {
  // Get static mapping as base (includes death dates)
  const staticInfo = AUTHOR_INFO[collectionName] || {
    writerName: '',
    writerDeath: '',
    aboutWriter: null,
  };

  // Try to read from JSON file to get updated author name and introduction
  const DATA_DIR = path.join(__dirname, '../data/hadiths');
  const FILES_MAP: { [key: string]: string } = {
    'sahih-bukhari': 'sahih-bukhari.json',
    'sahih-muslim': 'sahih-muslim.json',
    'sunan-an-nasai': 'sunan-an-nasai.json',
    'sunan-abu-dawud': 'sunan-abu-dawud.json',
    'jami-at-tirmidhi': 'jami-at-tirmidhi.json',
    'sunan-ibn-majah': 'sunan-ibn-majah.json',
    'muwatta-malik': 'muwatta-malik.json',
    'musnad-ahmad': 'musnad-ahmad.json',
    'sunan-darimi': 'sunan-darimi.json',
  };

  const filename = FILES_MAP[collectionName];
  if (filename) {
    const filePath = path.join(DATA_DIR, filename);
    try {
      if (fs.existsSync(filePath)) {
        // Read JSON file to get metadata
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        if (data.metadata && data.metadata.english) {
          // Merge JSON metadata with static mapping (JSON has author name, static has death date)
          return {
            writerName: data.metadata.english.author || staticInfo.writerName,
            writerDeath: staticInfo.writerDeath, // Death date from static mapping
            aboutWriter: data.metadata.english.introduction || staticInfo.aboutWriter,
          };
        }
      }
    } catch (error) {
      logger.warn(`Failed to read author info from ${filename}, using static mapping:`, error);
    }
  }

  // Fallback to static mapping
  return staticInfo;
};

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

interface HadithPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Helper to transform MongoDB hadith to API format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformHadithToApiFormat = (hadith: IHadith | any): HadithApiHadith => {
  const id = parseInt(hadith.hadithNumber) || 
             (hadith._id && typeof hadith._id === 'object' && 'toString' in hadith._id 
               ? parseInt(hadith._id.toString().slice(-8), 16) 
               : 0);

  // Get author information for the collection
  const authorInfo = getAuthorInfo(hadith.collectionName);

  return {
    id: id,
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
      bookName: COLLECTION_NAMES[hadith.collectionName] || hadith.collectionName,
      writerName: authorInfo.writerName,
      aboutWriter: authorInfo.aboutWriter,
      writerDeath: authorInfo.writerDeath,
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

// Get all books (Collections)
export const getBooks = async (): Promise<HadithApiBook[]> => {
  try {
    const cacheKey = 'hadith:books:v3'; // Updated version to include author info
    
    // Check cache first
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const collections = await Hadith.distinct('collectionName');
    const books: HadithApiBook[] = [];

    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      const hadithCount = await Hadith.countDocuments({ collectionName: collection });
      // We count unique "chapters" (which are actually Books/Kitabs in our new mapping)
      const chaptersCount = (await Hadith.distinct('book', { collectionName: collection })).length;

      // Get author information
      const authorInfo = getAuthorInfo(collection);

      books.push({
        id: i + 1, 
        bookName: COLLECTION_NAMES[collection] || collection,
        writerName: authorInfo.writerName,
        aboutWriter: authorInfo.aboutWriter,
        writerDeath: authorInfo.writerDeath,
        bookSlug: collection,
        hadiths_count: hadithCount.toString(),
        chapters_count: chaptersCount.toString(),
      });
    }

    if (books.length > 0) {
      await redisSet(cacheKey, JSON.stringify(books), 86400);
      logger.info(`Fetched ${books.length} collections from database`);
      return books;
    }

    return [];
  } catch (error) {
    logger.error('Get books error:', error);
    throw error;
  }
};

// Helper function to get sorted chapters for a book (sorted by minimum hadithNumber in each chapter)
const getSortedChaptersForBook = async (bookSlug: string): Promise<string[]> => {
  const cacheKey = `hadith:sorted-chapters:${bookSlug}:v2`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get chapters sorted by the minimum hadithNumber in each chapter
  const chaptersWithMinHadith = await Hadith.aggregate([
    { $match: { collectionName: bookSlug } },
    {
      $addFields: {
        hadithNumberNum: {
          $cond: {
            if: { $eq: [{ $type: "$hadithNumber" }, "string"] },
            then: {
              $ifNull: [
                {
                  $convert: {
                    input: "$hadithNumber",
                    to: "int",
                    onError: 999999,
                    onNull: 999999
                  }
                },
                999999
              ]
            },
            else: { $ifNull: ["$hadithNumber", 999999] }
          }
        }
      }
    },
    {
      $group: {
        _id: "$chapter",
        minHadithNumber: { $min: "$hadithNumberNum" }
      }
    },
    { $sort: { minHadithNumber: 1 } },
    { $project: { _id: 1 } }
  ]);

  const sortedChapters = chaptersWithMinHadith.map(item => item._id);
  
  await redisSet(cacheKey, JSON.stringify(sortedChapters), 3600);
  return sortedChapters;
};

// Get chapter name by sequential ID
export const getChapterNameBySequentialId = async (
  bookSlug: string,
  sequentialId: number
): Promise<string | null> => {
  const sortedChapters = await getSortedChaptersForBook(bookSlug);
  const index = sequentialId - 1; // Convert to 0-based index
  return sortedChapters[index] || null;
};

// Get chapters by book slug (Returns unique chapters from chapter field)
export const getChaptersByBook = async (
  bookSlug: string,
  paginate?: number,
  page?: number
): Promise<{ chapters: HadithApiChapter[], pagination: HadithPagination }> => {
  const limit = paginate || 25;
  const currentPage = page || 1;
  const skip = (currentPage - 1) * limit;
  
  const cacheKey = `hadith:chapters:${bookSlug}:${limit}:${currentPage}:v4`;
  
  // Check cache
  const cached = await redisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get distinct chapters from the chapter field, sorted alphabetically
  const sortedChapters = await getSortedChaptersForBook(bookSlug);

  const total = sortedChapters.length;
  const paginatedChapters = sortedChapters.slice(skip, skip + limit);

  // Map chapters with sequential IDs starting from 1
  const transformedChapters: HadithApiChapter[] = paginatedChapters.map((chapterName, index) => ({
    id: skip + index + 1, // Sequential ID starting from 1 for the entire collection
    chapterNumber: (skip + index + 1).toString(),
    chapterEnglish: chapterName,
    chapterUrdu: '',
    chapterArabic: '',
    bookSlug,
  }));

  const result = {
    chapters: transformedChapters,
    pagination: {
      current_page: currentPage,
      last_page: Math.ceil(total / limit),
      per_page: limit,
      total,
      from: skip + 1,
      to: Math.min(skip + limit, total),
    }
  };

  if (transformedChapters.length > 0) {
    await redisSet(cacheKey, JSON.stringify(result), 3600);
  }

  return result;
};

// Get hadiths with filters
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
    const cacheKey = `hadith:search:${JSON.stringify(filters)}:v2`;
    
    // Check cache (only for non-search queries)
    if (!filters.hadithEnglish && !filters.hadithUrdu && !filters.hadithArabic) {
      const cached = await redisGet(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const query: Record<string, unknown> = {};

    if (filters.book) {
      query.collectionName = filters.book;
    }

    if (filters.chapter) {
      // Match by chapter name (exact match)
      query.chapter = filters.chapter;
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

    // Use aggregation to sort hadithNumber numerically
    const [hadithsResult, totalResult] = await Promise.all([
      Hadith.aggregate([
        { $match: query },
        {
          $addFields: {
            hadithNumberNum: {
              $cond: {
                if: { $eq: [{ $type: "$hadithNumber" }, "string"] },
                then: {
                  $ifNull: [
                    {
                      $convert: {
                        input: "$hadithNumber",
                        to: "int",
                        onError: 0,
                        onNull: 0
                      }
                    },
                    0
                  ]
                },
                else: { $ifNull: ["$hadithNumber", 0] }
              }
            }
          }
        },
        { $sort: { hadithNumberNum: 1 } },
        { $skip: skip },
        { $limit: perPage },
        {
          $project: {
            hadithNumberNum: 0 // Remove the temporary field
          }
        }
      ]),
      Hadith.countDocuments(query),
    ]);

    const hadiths = hadithsResult;
    const total = totalResult;

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

    if (!filters.hadithEnglish && !filters.hadithUrdu && !filters.hadithArabic) {
      await redisSet(cacheKey, JSON.stringify(result), 3600);
    }

    return result;
  } catch (error) {
    logger.error('Get hadiths error:', error);
    throw error;
  }
};

// Get hadith by ID
export const getHadithById = async (id: number): Promise<HadithApiHadith | null> => {
  try {
    const cacheKey = `hadith:id:${id}:v2`;
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const hadith = await Hadith.findOne({ hadithNumber: id.toString() });
    
    if (hadith) {
      const transformed = transformHadithToApiFormat(hadith);
      await redisSet(cacheKey, JSON.stringify(transformed), 86400);
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
