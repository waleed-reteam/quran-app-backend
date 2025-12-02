import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Hadith from '../models/mongodb/Hadith';
import logger from '../utils/logger';

dotenv.config();

const HADITH_API_BASE = 'https://hadithapi.com/api';
const HADITH_API_KEY = process.env.HADITH_API_KEY || '$2y$10$unZvEIUjLokiEp5auSAYpe6uqmglNe17sOkYbSi62ibUEqVdPNyS';

/**
 * Hadith Seeding Script
 * 
 * Fetches Hadith data from Hadith API and stores it in MongoDB
 * as a fallback mechanism. This ensures the app can work even if the API is down.
 */
const seedHadiths = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quran_app';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected');

    // Clear existing hadiths
    await Hadith.deleteMany({});
    logger.info('Cleared existing hadiths');

    // Fetch books from API with retry logic
    logger.info('Fetching books from Hadith API...');
    let booksResponse: any;
    let retries = 3;
    while (retries > 0) {
      try {
        booksResponse = await axios.get(`${HADITH_API_BASE}/books`, {
          params: { apiKey: HADITH_API_KEY },
          timeout: 10000, // 10 second timeout
        });
        if (booksResponse && booksResponse.data.status === 200 && booksResponse.data.books) {
          break;
        } else {
          throw new Error('Invalid response from Hadith API');
        }
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          logger.error('Failed to fetch books from Hadith API after 3 retries:', error.message);
          throw error;
        }
        logger.warn(`Failed to fetch books, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    if (!booksResponse || !booksResponse.data.books) {
      throw new Error('Failed to fetch books from Hadith API');
    }

    const books = booksResponse.data.books;
    logger.info(`Found ${books.length} hadith collections`);

    let totalHadiths = 0;

    // Fetch hadiths from each collection
    for (const book of books) {
      try {
        logger.info(`Fetching hadiths from ${book.bookName}...`);
        
        let page = 1;
        const perPage = 25;
        let hasMore = true;
        let collectionCount = 0;
        const maxPages = 100; // Limit to avoid too many API calls (2500 hadiths per collection)

        while (hasMore && page <= maxPages) {
          let hadithsResponse;
          let requestRetries = 3;
          let requestSuccess = false;
          
          while (requestRetries > 0 && !requestSuccess) {
            try {
              hadithsResponse = await axios.get(`${HADITH_API_BASE}/hadiths/`, {
                params: {
                  apiKey: HADITH_API_KEY,
                  book: book.bookSlug,
                  paginate: perPage,
                  page,
                },
                timeout: 10000, // 10 second timeout
              });

              if (hadithsResponse.data.status === 200 && hadithsResponse.data.hadiths) {
                requestSuccess = true;
              } else if (hadithsResponse.data.status === 404) {
                // 404 means no more hadiths for this book
                logger.info(`No more hadiths found for ${book.bookName} at page ${page}`);
                hasMore = false;
                break;
              } else {
                throw new Error(`Invalid response: status ${hadithsResponse.data.status}`);
              }
            } catch (error: any) {
              requestRetries--;
              if (requestRetries === 0) {
                logger.warn(`Failed to fetch hadiths from ${book.bookName}, page ${page} after 3 retries:`, error.message);
                hasMore = false;
                break;
              } else {
                logger.warn(`Failed to fetch hadiths from ${book.bookName}, page ${page}, retrying... (${requestRetries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
              }
            }
          }
          
          if (!requestSuccess || !hadithsResponse) {
            break;
          }

          const hadithsData = hadithsResponse.data.hadiths;
          const hadiths = hadithsData.data || [];

          // Transform and insert hadiths
          const hadithsToInsert = hadiths.map((apiHadith: any) => ({
            collectionName: apiHadith.bookSlug,
            book: apiHadith.book?.bookName || book.bookName,
            bookNumber: apiHadith.book?.id || book.id,
            hadithNumber: apiHadith.hadithNumber,
            chapter: apiHadith.chapter?.chapterEnglish || '',
            chapterNumber: apiHadith.chapter?.chapterNumber ? parseInt(apiHadith.chapter.chapterNumber) : undefined,
            arabicText: apiHadith.hadithArabic || '',
            englishText: apiHadith.hadithEnglish || '',
            urduText: apiHadith.hadithUrdu || '',
            grade: apiHadith.status || '',
            narrator: apiHadith.englishNarrator || '',
            tags: extractTags(apiHadith.hadithEnglish || ''),
          }));

          if (hadithsToInsert.length > 0) {
            await Hadith.insertMany(hadithsToInsert);
            collectionCount += hadithsToInsert.length;
            totalHadiths += hadithsToInsert.length;
          }

          hasMore = hadithsData.current_page < hadithsData.last_page;
          page++;

          // Log progress every 10 pages
          if (page % 10 === 0) {
            logger.info(`  Processed ${collectionCount} hadiths from ${book.bookName}...`);
          }
        }

        logger.info(`✅ Inserted ${collectionCount} hadiths from ${book.bookName}`);
      } catch (error) {
        logger.error(`Error processing ${book.bookName}:`, error);
      }
    }

    logger.info('');
    logger.info('✨ Successfully seeded Hadith data into MongoDB!');
    logger.info(`   Total: ${totalHadiths} hadiths`);
    logger.info('   This data will be used as fallback if API is unavailable.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seed Hadiths error:', error);
    process.exit(1);
  }
};

// Extract tags from hadith text
const extractTags = (text: string): string[] => {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();

  const keywords = [
    'prayer', 'pray', 'salah', 'namaz', 'fasting', 'ramadan', 'zakat', 'charity',
    'hajj', 'pilgrimage', 'prophet', 'messenger', 'allah', 'god', 'faith', 'belief',
    'patience', 'gratitude', 'forgiveness', 'mercy', 'knowledge', 'wisdom', 'guidance',
    'paradise', 'hell', 'judgment', 'resurrection', 'quran', 'recitation',
  ];

  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return tags;
};

seedHadiths();
