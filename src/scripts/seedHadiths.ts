import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Hadith from '../models/mongodb/Hadith';
import logger from '../utils/logger';

dotenv.config();

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

/**
 * Hadith Seeding Script
 * 
 * Reads Hadith data from local JSON files and stores it in MongoDB.
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

    let totalHadiths = 0;

    for (const [collectionName, filename] of Object.entries(FILES_MAP)) {
      const filePath = path.join(DATA_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        logger.warn(`File not found: ${filename}, skipping...`);
        continue;
      }

      logger.info(`Processing ${collectionName} from ${filename}...`);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        // Create a map of chapters for quick lookup
        const chaptersMap = new Map();
        if (data.chapters) {
          data.chapters.forEach((ch: any) => {
            chaptersMap.set(ch.id, ch);
          });
        }

        const hadiths = data.hadiths || [];
        const hadithsToInsert = [];

        for (const hadith of hadiths) {
          const chapterData = chaptersMap.get(hadith.chapterId);
          const bookName = chapterData ? chapterData.english : (data.metadata?.english?.title || collectionName);
          
          // Skip if no English text, or provide placeholder if you prefer. 
          // For now, let's skip if both Arabic and English are missing, 
          // but if only English is missing, maybe use Arabic or placeholder?
          // The schema requires englishText.
          const englishText = hadith.english?.text && hadith.english.text.trim().length > 0 
            ? hadith.english.text 
            : (hadith.arabic || 'Translation not available');

          if (!englishText) continue; // Skip if absolutely no text

          hadithsToInsert.push({
            collectionName,
            book: bookName || 'Unknown Book',
            bookNumber: hadith.bookId || hadith.chapterId || 0,
            hadithNumber: String(hadith.idInBook),
            chapter: bookName || 'General', // Use Book name as Chapter if no specific chapter
            chapterNumber: undefined,
            arabicText: hadith.arabic || '',
            englishText: englishText,
            urduText: '',
            grade: '',
            narrator: hadith.english?.narrator || '',
            tags: extractTags(englishText),
          });
        }

        // Insert in batches to avoid memory issues
        const BATCH_SIZE = 1000;
        for (let i = 0; i < hadithsToInsert.length; i += BATCH_SIZE) {
          const batch = hadithsToInsert.slice(i, i + BATCH_SIZE);
          await Hadith.insertMany(batch);
          logger.info(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} hadiths)`);
        }

        totalHadiths += hadithsToInsert.length;
        logger.info(`✅ Inserted ${hadithsToInsert.length} hadiths for ${collectionName}`);

      } catch (err) {
        logger.error(`Error processing ${filename}:`, err);
      }
    }

    logger.info('');
    logger.info('✨ Successfully seeded Hadith data into MongoDB!');
    logger.info(`   Total: ${totalHadiths} hadiths`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Seed Hadiths error:', error);
    process.exit(1);
  }
};

// Extract tags from hadith text
const extractTags = (text: string): string[] => {
  const tags: string[] = [];
  if (!text) return tags;
  
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
