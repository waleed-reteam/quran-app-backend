import axios from 'axios';
import logger from '../utils/logger';
import { redisGet, redisSet, ensureMongoDBConnected } from '../config/database';
import Surah from '../models/mongodb/Quran';

const QURAN_API_BASE = process.env.ALQURAN_API_URL || 'https://api.alquran.cloud/v1';

// Default editions
const DEFAULT_ARABIC_EDITION = 'quran-uthmani';
const DEFAULT_ENGLISH_EDITION = 'en.asad';
const DEFAULT_AUDIO_EDITION = 'ar.alafasy';

interface QuranApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  audio?: string;
  audioSecondary?: string[];
}

interface QuranApiSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahs: QuranApiAyah[];
}

interface QuranApiResponse<T> {
  code: number;
  status: string;
  data: T;
}

interface QuranApiEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: 'text' | 'audio';
  type: string;
  direction?: string;
}

interface MongoSurah {
  number: number;
  name: string;
  nameArabic: string;
  nameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahs: MongoAyah[];
}

interface MongoAyah {
  number: number;
  numberInSurah: number;
  text: string;
  textArabic: string;
  translation?: string;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda?: boolean;
}

// Helper to transform MongoDB surah to API format
const transformSurahToApiFormat = (surah: MongoSurah): QuranApiSurah => {
  return {
    number: surah.number,
    name: surah.nameArabic,
    englishName: surah.name,
    englishNameTranslation: surah.nameTranslation,
    revelationType: surah.revelationType,
    ayahs: surah.ayahs.map((ayah: MongoAyah) => ({
      number: ayah.number,
      text: ayah.textArabic,
      numberInSurah: ayah.numberInSurah,
      juz: ayah.juz,
      manzil: ayah.manzil,
      page: ayah.page,
      ruku: ayah.ruku,
      hizbQuarter: ayah.hizbQuarter,
      sajda: ayah.sajda || false,
    })),
  };
};

// Helper to transform MongoDB ayah to API format
const transformAyahToApiFormat = (ayah: MongoAyah): QuranApiAyah => {
  return {
    number: ayah.number,
    text: ayah.textArabic,
    numberInSurah: ayah.numberInSurah,
    juz: ayah.juz,
    manzil: ayah.manzil,
    page: ayah.page,
    ruku: ayah.ruku,
    hizbQuarter: ayah.hizbQuarter,
    sajda: ayah.sajda || false,
  };
};

// Get all available editions
export const getEditions = async (filters?: {
  format?: 'text' | 'audio';
  language?: string;
  type?: string;
}): Promise<QuranApiEdition[]> => {
  try {
    const cacheKey = `quran:editions:${JSON.stringify(filters || {})}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const params: Record<string, string> = {};
    if (filters?.format) params.format = filters.format;
    if (filters?.language) params.language = filters.language;
    if (filters?.type) params.type = filters.type;

    const response = await axios.get<QuranApiResponse<QuranApiEdition[]>>(
      `${QURAN_API_BASE}/edition`,
      { params }
    );

    if (response.data.code === 200 && response.data.data) {
      const editions = Array.isArray(response.data.data) 
        ? response.data.data 
        : [response.data.data];
      
      // Cache for 24 hours
      await redisSet(cacheKey, JSON.stringify(editions), 86400);
      
      return editions;
    }

    throw new Error('Failed to fetch editions from Quran API');
  } catch (error) {
    logger.error('Get editions error:', error);
    throw error;
  }
};

// Get all surahs (list only, no ayahs) - with fallback
export const getSurahsList = async (): Promise<QuranApiSurah[]> => {
  try {
    const cacheKey = 'quran:surahs:list';
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<QuranApiResponse<{ surahs: QuranApiSurah[] }>>(
        `${QURAN_API_BASE}/surah`,
        { timeout: 5000 } // 5 second timeout
      );

      if (response.data.code === 200 && response.data.data.surahs) {
        const surahs = response.data.data.surahs.map(surah => ({
          ...surah,
          ayahs: [], // Remove ayahs for list view
        }));
        
        // Cache for 24 hours
        await redisSet(cacheKey, JSON.stringify(surahs), 86400);
        
        return surahs;
      }
    } catch (apiError) {
      logger.warn('Quran API failed, falling back to database:', apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    if (!(await ensureMongoDBConnected())) {
      throw new Error('Database connection unavailable');
    }
    
    const surahs = await Surah.find({}, { ayahs: 0 }).sort({ number: 1 });
    if (surahs.length > 0) {
      const transformed = surahs.map(surah => ({
        number: surah.number,
        name: surah.nameArabic,
        englishName: surah.name,
        englishNameTranslation: surah.nameTranslation,
        revelationType: surah.revelationType,
        ayahs: [],
      }));
      
      // Cache for 1 hour (shorter cache for fallback data)
      await redisSet(cacheKey, JSON.stringify(transformed), 3600);
      
      logger.info(`Fetched ${transformed.length} surahs from database (fallback)`);
      return transformed;
    }

    throw new Error('Failed to fetch surahs from API and database is empty');
  } catch (error) {
    logger.error('Get surahs list error:', error);
    throw error;
  }
};

// Get surah by number with ayahs - with fallback
export const getSurah = async (
  surahNumber: number,
  edition?: string
): Promise<QuranApiSurah | null> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:surah:${surahNumber}:${editionId}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<QuranApiResponse<QuranApiSurah>>(
        `${QURAN_API_BASE}/surah/${surahNumber}/${editionId}`,
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const surah = response.data.data;
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(surah), 43200);
        
        return surah;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for surah ${surahNumber}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surah = await Surah.findOne({ number: surahNumber });
    if (surah) {
      // Transform to API format
      let transformed: QuranApiSurah;
      
      if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
        // Arabic edition - use Arabic text
        transformed = transformSurahToApiFormat(surah);
      } else if (editionId.startsWith('en.')) {
        // English edition - use translation
        transformed = {
          number: surah.number,
          name: surah.nameArabic,
          englishName: surah.name,
          englishNameTranslation: surah.nameTranslation,
          revelationType: surah.revelationType,
          ayahs: surah.ayahs.map((ayah: MongoAyah) => ({
            number: ayah.number,
            text: ayah.translation || ayah.text,
            numberInSurah: ayah.numberInSurah,
            juz: ayah.juz,
            manzil: ayah.manzil,
            page: ayah.page,
            ruku: ayah.ruku,
            hizbQuarter: ayah.hizbQuarter,
            sajda: ayah.sajda || false,
          })),
        };
      } else {
        // Default to Arabic
        transformed = transformSurahToApiFormat(surah);
      }
      
      // Cache for 1 hour (shorter cache for fallback data)
      await redisSet(cacheKey, JSON.stringify(transformed), 3600);
      
      logger.info(`Fetched surah ${surahNumber} from database (fallback)`);
      return transformed;
    }

    return null;
  } catch (error) {
    logger.error(`Get surah ${surahNumber} error:`, error);
    return null;
  }
};

// Get surah from multiple editions - with fallback
export const getSurahMultipleEditions = async (
  surahNumber: number,
  editions: string[]
): Promise<{ [edition: string]: QuranApiSurah }> => {
  try {
    const editionsStr = editions.join(',');
    const cacheKey = `quran:surah:${surahNumber}:multi:${editionsStr}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<QuranApiResponse<{ [edition: string]: QuranApiSurah }>>(
        `${QURAN_API_BASE}/surah/${surahNumber}/editions/${editionsStr}`,
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const result = response.data.data;
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(result), 43200);
        
        return result;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for surah ${surahNumber} multiple editions, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surah = await Surah.findOne({ number: surahNumber });
    if (surah) {
      const result: { [edition: string]: QuranApiSurah } = {};
      
      for (const edition of editions) {
        if (edition === DEFAULT_ARABIC_EDITION || !edition) {
          result[edition] = transformSurahToApiFormat(surah);
        } else if (edition.startsWith('en.')) {
          result[edition] = {
            number: surah.number,
            name: surah.nameArabic,
            englishName: surah.name,
            englishNameTranslation: surah.nameTranslation,
            revelationType: surah.revelationType,
            ayahs: surah.ayahs.map((ayah: MongoAyah) => ({
              number: ayah.number,
              text: ayah.translation || ayah.text,
              numberInSurah: ayah.numberInSurah,
              juz: ayah.juz,
              manzil: ayah.manzil,
              page: ayah.page,
              ruku: ayah.ruku,
              hizbQuarter: ayah.hizbQuarter,
              sajda: ayah.sajda || false,
            })),
          };
        }
      }
      
      if (Object.keys(result).length > 0) {
        await redisSet(cacheKey, JSON.stringify(result), 3600);
        logger.info(`Fetched surah ${surahNumber} multiple editions from database (fallback)`);
        return result;
      }
    }

    return {};
  } catch (error) {
    logger.error(`Get surah ${surahNumber} multiple editions error:`, error);
    return {};
  }
};

// Get ayah by reference - with fallback
export const getAyah = async (
  reference: string | number,
  edition?: string
): Promise<QuranApiAyah | null> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:ayah:${reference}:${editionId}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<QuranApiResponse<QuranApiAyah>>(
        `${QURAN_API_BASE}/ayah/${reference}/${editionId}`,
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayah = response.data.data;
        
        // Cache for 24 hours
        await redisSet(cacheKey, JSON.stringify(ayah), 86400);
        
        return ayah;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for ayah ${reference}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    let surahNumber: number;
    let ayahNumber: number;

    if (typeof reference === 'string' && reference.includes(':')) {
      [surahNumber, ayahNumber] = reference.split(':').map(Number);
    } else {
      // If it's just a number, we need to find which surah it belongs to
      // This is complex, so we'll skip this fallback for numeric-only references
      return null;
    }

    const surah = await Surah.findOne({ number: surahNumber });
    if (surah) {
      const ayah = surah.ayahs.find(a => a.numberInSurah === ayahNumber);
      if (ayah) {
        let transformed: QuranApiAyah;
        
        if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
          transformed = transformAyahToApiFormat(ayah);
        } else if (editionId.startsWith('en.')) {
          transformed = {
            number: ayah.number,
            text: ayah.translation || ayah.text,
            numberInSurah: ayah.numberInSurah,
            juz: ayah.juz,
            manzil: ayah.manzil,
            page: ayah.page,
            ruku: ayah.ruku,
            hizbQuarter: ayah.hizbQuarter,
            sajda: ayah.sajda || false,
          };
        } else {
          transformed = transformAyahToApiFormat(ayah);
        }
        
        await redisSet(cacheKey, JSON.stringify(transformed), 86400);
        logger.info(`Fetched ayah ${reference} from database (fallback)`);
        return transformed;
      }
    }

    return null;
  } catch (error) {
    logger.error(`Get ayah ${reference} error:`, error);
    return null;
  }
};

// Get ayah from multiple editions - with fallback
export const getAyahMultipleEditions = async (
  reference: string | number,
  editions: string[]
): Promise<{ [edition: string]: QuranApiAyah }> => {
  try {
    const editionsStr = editions.join(',');
    const cacheKey = `quran:ayah:${reference}:multi:${editionsStr}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<QuranApiResponse<{ [edition: string]: QuranApiAyah }>>(
        `${QURAN_API_BASE}/ayah/${reference}/editions/${editionsStr}`,
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const result = response.data.data;
        
        // Cache for 24 hours
        await redisSet(cacheKey, JSON.stringify(result), 86400);
        
        return result;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for ayah ${reference} multiple editions, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    let surahNumber: number;
    let ayahNumber: number;

    if (typeof reference === 'string' && reference.includes(':')) {
      [surahNumber, ayahNumber] = reference.split(':').map(Number);
    } else {
      return {};
    }

    const surah = await Surah.findOne({ number: surahNumber });
    if (surah) {
      const ayah = surah.ayahs.find(a => a.numberInSurah === ayahNumber);
      if (ayah) {
        const result: { [edition: string]: QuranApiAyah } = {};
        
        for (const edition of editions) {
          if (edition === DEFAULT_ARABIC_EDITION || !edition) {
            result[edition] = transformAyahToApiFormat(ayah);
          } else if (edition.startsWith('en.')) {
            result[edition] = {
              number: ayah.number,
              text: ayah.translation || ayah.text,
              numberInSurah: ayah.numberInSurah,
              juz: ayah.juz,
              manzil: ayah.manzil,
              page: ayah.page,
              ruku: ayah.ruku,
              hizbQuarter: ayah.hizbQuarter,
              sajda: ayah.sajda || false,
            };
          }
        }
        
        if (Object.keys(result).length > 0) {
          await redisSet(cacheKey, JSON.stringify(result), 86400);
          logger.info(`Fetched ayah ${reference} multiple editions from database (fallback)`);
          return result;
        }
      }
    }

    return {};
  } catch (error) {
    logger.error(`Get ayah ${reference} multiple editions error:`, error);
    return {};
  }
};

// Get juz - with fallback
export const getJuz = async (
  juzNumber: number,
  edition?: string,
  offset?: number,
  limit?: number
): Promise<QuranApiAyah[]> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:juz:${juzNumber}:${editionId}:${offset || 0}:${limit || 'all'}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const params: Record<string, number> = {};
      if (offset) params.offset = offset;
      if (limit) params.limit = limit;

      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        `${QURAN_API_BASE}/juz/${juzNumber}/${editionId}`,
        { params, timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(ayahs), 43200);
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for juz ${juzNumber}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surahs = await Surah.find({ 'ayahs.juz': juzNumber });
    if (surahs.length > 0) {
      const ayahs = surahs.flatMap(surah =>
        surah.ayahs
          .filter(ayah => ayah.juz === juzNumber)
          .map(ayah => {
            if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
              return transformAyahToApiFormat(ayah);
            } else if (editionId.startsWith('en.')) {
              return {
                ...transformAyahToApiFormat(ayah),
                text: ayah.translation || ayah.text,
              };
            }
            return transformAyahToApiFormat(ayah);
          })
      );

      // Apply offset and limit
      let result = ayahs;
      if (offset) result = result.slice(offset);
      if (limit) result = result.slice(0, limit);

      await redisSet(cacheKey, JSON.stringify(result), 3600);
      logger.info(`Fetched juz ${juzNumber} from database (fallback)`);
      return result;
    }

    return [];
  } catch (error) {
    logger.error(`Get juz ${juzNumber} error:`, error);
    return [];
  }
};

// Get page - with fallback
export const getPage = async (
  pageNumber: number,
  edition?: string,
  offset?: number,
  limit?: number
): Promise<QuranApiAyah[]> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:page:${pageNumber}:${editionId}:${offset || 0}:${limit || 'all'}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const params: Record<string, number> = {};
      if (offset) params.offset = offset;
      if (limit) params.limit = limit;

      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        `${QURAN_API_BASE}/page/${pageNumber}/${editionId}`,
        { params, timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(ayahs), 43200);
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for page ${pageNumber}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surahs = await Surah.find({ 'ayahs.page': pageNumber });
    if (surahs.length > 0) {
      const ayahs = surahs.flatMap(surah =>
        surah.ayahs
          .filter(ayah => ayah.page === pageNumber)
          .map(ayah => {
            if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
              return transformAyahToApiFormat(ayah);
            } else if (editionId.startsWith('en.')) {
              return {
                ...transformAyahToApiFormat(ayah),
                text: ayah.translation || ayah.text,
              };
            }
            return transformAyahToApiFormat(ayah);
          })
      );

      // Apply offset and limit
      let result = ayahs;
      if (offset) result = result.slice(offset);
      if (limit) result = result.slice(0, limit);

      await redisSet(cacheKey, JSON.stringify(result), 3600);
      logger.info(`Fetched page ${pageNumber} from database (fallback)`);
      return result;
    }

    return [];
  } catch (error) {
    logger.error(`Get page ${pageNumber} error:`, error);
    return [];
  }
};

// Get manzil - with fallback
export const getManzil = async (
  manzilNumber: number,
  edition?: string,
  offset?: number,
  limit?: number
): Promise<QuranApiAyah[]> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:manzil:${manzilNumber}:${editionId}:${offset || 0}:${limit || 'all'}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const params: Record<string, number> = {};
      if (offset) params.offset = offset;
      if (limit) params.limit = limit;

      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        `${QURAN_API_BASE}/manzil/${manzilNumber}/${editionId}`,
        { params, timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(ayahs), 43200);
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for manzil ${manzilNumber}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surahs = await Surah.find({ 'ayahs.manzil': manzilNumber });
    if (surahs.length > 0) {
      const ayahs = surahs.flatMap(surah =>
        surah.ayahs
          .filter(ayah => ayah.manzil === manzilNumber)
          .map(ayah => {
            if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
              return transformAyahToApiFormat(ayah);
            } else if (editionId.startsWith('en.')) {
              return {
                ...transformAyahToApiFormat(ayah),
                text: ayah.translation || ayah.text,
              };
            }
            return transformAyahToApiFormat(ayah);
          })
      );

      // Apply offset and limit
      let result = ayahs;
      if (offset) result = result.slice(offset);
      if (limit) result = result.slice(0, limit);

      await redisSet(cacheKey, JSON.stringify(result), 3600);
      logger.info(`Fetched manzil ${manzilNumber} from database (fallback)`);
      return result;
    }

    return [];
  } catch (error) {
    logger.error(`Get manzil ${manzilNumber} error:`, error);
    return [];
  }
};

// Get ruku - with fallback
export const getRuku = async (
  rukuNumber: number,
  edition?: string,
  offset?: number,
  limit?: number
): Promise<QuranApiAyah[]> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:ruku:${rukuNumber}:${editionId}:${offset || 0}:${limit || 'all'}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const params: Record<string, number> = {};
      if (offset) params.offset = offset;
      if (limit) params.limit = limit;

      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        `${QURAN_API_BASE}/ruku/${rukuNumber}/${editionId}`,
        { params, timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(ayahs), 43200);
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for ruku ${rukuNumber}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surahs = await Surah.find({ 'ayahs.ruku': rukuNumber });
    if (surahs.length > 0) {
      const ayahs = surahs.flatMap(surah =>
        surah.ayahs
          .filter(ayah => ayah.ruku === rukuNumber)
          .map(ayah => {
            if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
              return transformAyahToApiFormat(ayah);
            } else if (editionId.startsWith('en.')) {
              return {
                ...transformAyahToApiFormat(ayah),
                text: ayah.translation || ayah.text,
              };
            }
            return transformAyahToApiFormat(ayah);
          })
      );

      // Apply offset and limit
      let result = ayahs;
      if (offset) result = result.slice(offset);
      if (limit) result = result.slice(0, limit);

      await redisSet(cacheKey, JSON.stringify(result), 3600);
      logger.info(`Fetched ruku ${rukuNumber} from database (fallback)`);
      return result;
    }

    return [];
  } catch (error) {
    logger.error(`Get ruku ${rukuNumber} error:`, error);
    return [];
  }
};

// Get hizb quarter - with fallback
export const getHizbQuarter = async (
  hizbNumber: number,
  edition?: string,
  offset?: number,
  limit?: number
): Promise<QuranApiAyah[]> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:hizb:${hizbNumber}:${editionId}:${offset || 0}:${limit || 'all'}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const params: Record<string, number> = {};
      if (offset) params.offset = offset;
      if (limit) params.limit = limit;

      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        `${QURAN_API_BASE}/hizbQuarter/${hizbNumber}/${editionId}`,
        { params, timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Cache for 12 hours
        await redisSet(cacheKey, JSON.stringify(ayahs), 43200);
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn(`Quran API failed for hizb quarter ${hizbNumber}, falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surahs = await Surah.find({ 'ayahs.hizbQuarter': hizbNumber });
    if (surahs.length > 0) {
      const ayahs = surahs.flatMap(surah =>
        surah.ayahs
          .filter(ayah => ayah.hizbQuarter === hizbNumber)
          .map(ayah => {
            if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
              return transformAyahToApiFormat(ayah);
            } else if (editionId.startsWith('en.')) {
              return {
                ...transformAyahToApiFormat(ayah),
                text: ayah.translation || ayah.text,
              };
            }
            return transformAyahToApiFormat(ayah);
          })
      );

      // Apply offset and limit
      let result = ayahs;
      if (offset) result = result.slice(offset);
      if (limit) result = result.slice(0, limit);

      await redisSet(cacheKey, JSON.stringify(result), 3600);
      logger.info(`Fetched hizb quarter ${hizbNumber} from database (fallback)`);
      return result;
    }

    return [];
  } catch (error) {
    logger.error(`Get hizb quarter ${hizbNumber} error:`, error);
    return [];
  }
};

// Get sajda ayahs - with fallback
export const getSajdaAyahs = async (edition?: string): Promise<QuranApiAyah[]> => {
  try {
    const editionId = edition || DEFAULT_ARABIC_EDITION;
    const cacheKey = `quran:sajda:${editionId}`;
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try API first
    try {
      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        `${QURAN_API_BASE}/sajda/${editionId}`,
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Cache for 24 hours
        await redisSet(cacheKey, JSON.stringify(ayahs), 86400);
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn('Quran API failed for sajda ayahs, falling back to database:', apiError);
      // Fall through to database fallback
    }

    // Fallback to database
    const surahs = await Surah.find({ 'ayahs.sajda': true });
    if (surahs.length > 0) {
      const ayahs = surahs.flatMap(surah =>
        surah.ayahs
          .filter(ayah => ayah.sajda)
          .map(ayah => {
            if (editionId === DEFAULT_ARABIC_EDITION || !editionId) {
              return transformAyahToApiFormat(ayah);
            } else if (editionId.startsWith('en.')) {
              return {
                ...transformAyahToApiFormat(ayah),
                text: ayah.translation || ayah.text,
              };
            }
            return transformAyahToApiFormat(ayah);
          })
      );

      await redisSet(cacheKey, JSON.stringify(ayahs), 86400);
      logger.info(`Fetched ${ayahs.length} sajda ayahs from database (fallback)`);
      return ayahs;
    }

    return [];
  } catch (error) {
    logger.error('Get sajda ayahs error:', error);
    return [];
  }
};

// Search Quran - with fallback
export const searchQuran = async (
  keyword: string,
  surah: number | 'all' = 'all',
  edition?: string,
  language?: string
): Promise<QuranApiAyah[]> => {
  try {
    // Try API first
    try {
      const editionParam = edition || language || 'en';
      const url = `${QURAN_API_BASE}/search/${keyword}/${surah}/${editionParam}`;

      const response = await axios.get<QuranApiResponse<QuranApiAyah[]>>(
        url,
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data) {
        const ayahs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        return ayahs;
      }
    } catch (apiError) {
      logger.warn(`Quran API search failed for "${keyword}", falling back to database:`, apiError);
      // Fall through to database fallback
    }

    // Fallback to database search
    const searchQuery: Record<string, unknown> = {};
    
    if (surah !== 'all') {
      searchQuery.number = surah;
    }

    if (language === 'ar' || !language || !edition || edition === DEFAULT_ARABIC_EDITION) {
      searchQuery['ayahs.textArabic'] = { $regex: keyword, $options: 'i' };
    } else {
      searchQuery['ayahs.translation'] = { $regex: keyword, $options: 'i' };
    }

    const surahs = await Surah.find(searchQuery, {
      number: 1,
      name: 1,
      nameArabic: 1,
      'ayahs.$': 1,
    }).limit(50);

    const ayahs = surahs.flatMap(surah =>
      surah.ayahs
        .filter(ayah => {
          if (language === 'ar' || !language || !edition || edition === DEFAULT_ARABIC_EDITION) {
            return ayah.textArabic?.toLowerCase().includes(keyword.toLowerCase());
          } else {
            return ayah.translation?.toLowerCase().includes(keyword.toLowerCase());
          }
        })
        .map(ayah => {
          if (edition === DEFAULT_ARABIC_EDITION || !edition) {
            return transformAyahToApiFormat(ayah);
          } else if (edition.startsWith('en.')) {
            return {
              ...transformAyahToApiFormat(ayah),
              text: ayah.translation || ayah.text,
            };
          }
          return transformAyahToApiFormat(ayah);
        })
    );

    logger.info(`Fetched ${ayahs.length} search results from database (fallback)`);
    return ayahs;
  } catch (error) {
    logger.error('Search Quran error:', error);
    return [];
  }
};

// Get meta data - API only (no fallback needed)
export const getMeta = async (): Promise<Record<string, unknown> | null> => {
  try {
    const cacheKey = 'quran:meta';
    
    const cached = await redisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Record<string, unknown>;
    }

    const response = await axios.get<QuranApiResponse<Record<string, unknown>>>(
      `${QURAN_API_BASE}/meta`,
      { timeout: 5000 }
    );

    if (response.data.code === 200 && response.data.data) {
      const meta = response.data.data;
      
      // Cache for 24 hours
      await redisSet(cacheKey, JSON.stringify(meta), 86400);
      
      return meta;
    }

    return null;
  } catch (error) {
    logger.error('Get meta error:', error);
    return null;
  }
};

// Helper to get default editions
export const getDefaultEditions = () => ({
  arabic: DEFAULT_ARABIC_EDITION,
  english: DEFAULT_ENGLISH_EDITION,
  audio: DEFAULT_AUDIO_EDITION,
});
