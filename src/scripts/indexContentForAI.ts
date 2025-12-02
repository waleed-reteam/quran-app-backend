import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Dua from '../models/mongodb/Dua';
import { initializePinecone, batchIndexContent } from '../services/aiService';
import { getSurahsList, getSurah } from '../services/quranApiService';
import { getBooks, getHadiths } from '../services/hadithApiService';
import logger from '../utils/logger';

dotenv.config();

/**
 * Index Content for AI Search
 * 
 * This script indexes Quran, Hadiths, and Duas for AI-powered semantic search.
 * 
 * NOTE: 
 * - Quran is fetched from AlQuran Cloud API
 * - Hadiths are fetched from Hadith API
 * - Duas are fetched from MongoDB
 */
const indexAllContent = async () => {
  try {
    // Connect to MongoDB (for Duas)
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quran_app';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected');

    // Initialize Pinecone
    await initializePinecone();
    if (!process.env.PINECONE_API_KEY) {
      logger.warn('Pinecone not configured. Skipping indexing.');
      process.exit(0);
    }
    logger.info('Pinecone initialized');

    // Index Quran ayahs from API
    logger.info('Indexing Quran ayahs from API...');
    const surahs = await getSurahsList();
    const quranItems = [];

    for (const surah of surahs) {
      try {
        // Get surah with ayahs (using Arabic edition for text)
        const surahWithAyahs = await getSurah(surah.number, 'quran-uthmani');
        if (!surahWithAyahs || !surahWithAyahs.ayahs) continue;

        // Also get English translation for better search
        const surahEnglish = await getSurah(surah.number, 'en.asad');
        
        for (const ayah of surahWithAyahs.ayahs) {
          const englishAyah = surahEnglish?.ayahs.find(a => a.numberInSurah === ayah.numberInSurah);
          const text = `${ayah.text} ${englishAyah?.text || ''}`;
          
          quranItems.push({
            contentType: 'quran',
            contentId: `${surah.number}:${ayah.numberInSurah}`,
            text,
            metadata: {
              surahNumber: surah.number,
              surahName: surah.englishName,
              ayahNumber: ayah.numberInSurah,
            },
          });
        }

        if (surah.number % 10 === 0) {
          logger.info(`Processed ${surah.number} surahs...`);
        }
      } catch (error) {
        logger.error(`Error processing surah ${surah.number}:`, error);
      }
    }

    if (quranItems.length > 0) {
      logger.info(`Indexing ${quranItems.length} Quran ayahs...`);
      await batchIndexContent(quranItems);
      logger.info(`✅ Indexed ${quranItems.length} Quran ayahs`);
    }

    // Index Hadiths from API
    logger.info('Indexing Hadiths from API...');
    const books = await getBooks();
    const hadithItems = [];

    // Index hadiths from each collection (limit to avoid too many API calls)
    for (const book of books.slice(0, 5)) { // Limit to first 5 collections
      try {
        logger.info(`Fetching hadiths from ${book.bookName}...`);
        
        // Fetch hadiths in batches
        let page = 1;
        const perPage = 25;
        let hasMore = true;
        let fetched = 0;
        const maxHadiths = 100; // Limit per collection to avoid too many API calls

        while (hasMore && fetched < maxHadiths) {
          const result = await getHadiths({
            book: book.bookSlug,
            paginate: perPage,
            page,
          });

          for (const hadith of result.hadiths) {
            const text = `${hadith.hadithArabic || ''} ${hadith.hadithEnglish || ''} ${hadith.hadithUrdu || ''}`;
            hadithItems.push({
              contentType: 'hadith',
              contentId: hadith.id.toString(),
              text,
              metadata: {
                collection: hadith.bookSlug,
                book: hadith.book.bookName,
                hadithNumber: hadith.hadithNumber,
              },
            });
            fetched++;
          }

          hasMore = result.pagination.current_page < result.pagination.last_page;
          page++;
        }

        logger.info(`Fetched ${fetched} hadiths from ${book.bookName}`);
      } catch (error) {
        logger.error(`Error fetching hadiths from ${book.bookName}:`, error);
      }
    }

    if (hadithItems.length > 0) {
      logger.info(`Indexing ${hadithItems.length} Hadiths...`);
      await batchIndexContent(hadithItems);
      logger.info(`✅ Indexed ${hadithItems.length} Hadiths`);
    }

    // Index Duas from MongoDB
    logger.info('Indexing Duas from MongoDB...');
    const duas = await Dua.find({});
    const duaItems = duas.map(dua => ({
      contentType: 'dua',
      contentId: String(dua._id),
      text: `${dua.title} ${dua.arabic} ${dua.translation}`,
      metadata: {
        category: dua.category,
        title: dua.title,
      },
    }));

    if (duaItems.length > 0) {
      logger.info(`Indexing ${duaItems.length} Duas...`);
      await batchIndexContent(duaItems);
      logger.info(`✅ Indexed ${duaItems.length} Duas`);
    }

    logger.info('');
    logger.info('✨ Successfully indexed all content for AI search!');
    logger.info(`   - Quran: ${quranItems.length} ayahs`);
    logger.info(`   - Hadiths: ${hadithItems.length} hadiths`);
    logger.info(`   - Duas: ${duaItems.length} duas`);
    logger.info(`   - Total: ${quranItems.length + hadithItems.length + duaItems.length} items`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Index content error:', error);
    process.exit(1);
  }
};

indexAllContent();
