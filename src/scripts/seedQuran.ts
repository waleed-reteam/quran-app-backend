import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Surah from '../models/mongodb/Quran';
import logger from '../utils/logger';

dotenv.config();

const QURAN_API = process.env.ALQURAN_API_URL || 'https://api.alquran.cloud/v1';

interface QuranApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda?: boolean;
}

interface QuranApiSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahs: QuranApiAyah[];
}

interface QuranApiSurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  numberOfAyahs: number;
}

interface QuranApiResponse {
  code: number;
  status: string;
  data: {
    surahs: QuranApiSurah[];
  };
}

interface QuranApiMetaResponse {
  data: {
    surahs: {
      references: QuranApiSurahMeta[];
    };
  };
}

/**
 * Quran Seeding Script
 * 
 * Fetches Quran data from AlQuran Cloud API and stores it in MongoDB
 * as a fallback mechanism. This ensures the app can work even if the API is down.
 */
const seedQuran = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quran_app';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected');

    // Clear existing surahs
    await Surah.deleteMany({});
    logger.info('Cleared existing surahs');

    // Fetch Quran data from API
    logger.info('Fetching Quran data from AlQuran Cloud API...');
    
    // Get Arabic text with retry logic
    logger.info('Fetching Arabic text...');
    let arabicData: QuranApiResponse['data'] | undefined;
    let retries = 3;
    while (retries > 0) {
      try {
        const arabicResponse = await axios.get<QuranApiResponse>(`${QURAN_API}/quran/quran-uthmani`, {
          timeout: 30000, // 30 second timeout
        });
        arabicData = arabicResponse.data.data;
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          logger.error('Failed to fetch Arabic text after 3 retries:', error.message);
          throw error;
        }
        logger.warn(`Failed to fetch Arabic text, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
    
    if (!arabicData) {
      throw new Error('Failed to fetch Arabic text');
    }

    // Get English translation (Muhammad Asad) with retry logic
    logger.info('Fetching English translation...');
    let englishData: QuranApiResponse['data'] = { surahs: [] };
    retries = 3;
    while (retries > 0) {
      try {
        const englishResponse = await axios.get<QuranApiResponse>(`${QURAN_API}/quran/en.asad`, {
          timeout: 30000, // 30 second timeout
        });
        englishData = englishResponse.data.data;
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          logger.error('Failed to fetch English translation after 3 retries:', error.message);
          // Continue without English translation if it fails
          logger.warn('Continuing without English translation...');
          englishData = { surahs: [] };
        } else {
          logger.warn(`Failed to fetch English translation, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }

    // Get Quran metadata with retry logic
    logger.info('Fetching metadata...');
    let surahsMeta: QuranApiSurahMeta[] | undefined;
    retries = 3;
    while (retries > 0) {
      try {
        const metaResponse = await axios.get<QuranApiMetaResponse>(`${QURAN_API}/meta`, {
          timeout: 10000, // 10 second timeout
        });
        surahsMeta = metaResponse.data.data.surahs.references;
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          logger.error('Failed to fetch metadata after 3 retries:', error.message);
          throw error;
        }
        logger.warn(`Failed to fetch metadata, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    if (!surahsMeta) {
      throw new Error('Failed to fetch metadata');
    }

    logger.info(`Processing ${surahsMeta.length} surahs...`);

    for (const surahMeta of surahsMeta) {
      try {
        const surahNumber = surahMeta.number;
        logger.info(`Processing Surah ${surahNumber}: ${surahMeta.englishName}`);

        // Get ayahs for this surah
        const arabicSurah = arabicData.surahs.find((s: QuranApiSurah) => s.number === surahNumber);
        const englishSurah = englishData.surahs.find((s: QuranApiSurah) => s.number === surahNumber);

        if (!arabicSurah || !arabicSurah.ayahs) {
          logger.warn(`No Arabic ayahs found for surah ${surahNumber}`);
          continue;
        }

        const ayahs = arabicSurah.ayahs.map((arabicAyah: QuranApiAyah, index: number) => {
          const englishAyah = englishSurah?.ayahs[index];
          
          return {
            number: arabicAyah.number,
            numberInSurah: arabicAyah.numberInSurah,
            text: englishAyah?.text || '',
            textArabic: arabicAyah.text,
            translation: englishAyah?.text || '',
            juz: arabicAyah.juz,
            manzil: arabicAyah.manzil,
            page: arabicAyah.page,
            ruku: arabicAyah.ruku,
            hizbQuarter: arabicAyah.hizbQuarter,
            sajda: arabicAyah.sajda || false,
          };
        });

        await Surah.create({
          number: surahMeta.number,
          name: surahMeta.englishName,
          nameArabic: surahMeta.name,
          nameTranslation: surahMeta.englishNameTranslation,
          revelationType: surahMeta.revelationType,
          numberOfAyahs: surahMeta.numberOfAyahs,
          ayahs,
        });

        logger.info(`✅ Inserted Surah ${surahNumber} with ${ayahs.length} ayahs`);
      } catch (error) {
        logger.error(`Error processing surah ${surahMeta.number}:`, error);
      }
    }

    logger.info('');
    logger.info('✨ Successfully seeded Quran data into MongoDB!');
    logger.info(`   Total: ${surahsMeta.length} surahs`);
    logger.info('   This data will be used as fallback if API is unavailable.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seed Quran error:', error);
    process.exit(1);
  }
};

seedQuran();
