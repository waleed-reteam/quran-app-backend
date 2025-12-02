import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Dua from '../models/mongodb/Dua';
import logger from '../utils/logger';

dotenv.config();

const DUA_SOURCES = [
  {
    url: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr/daily-dua/en.json',
    category: 'daily',
  },
  {
    url: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr/dhikr-after-salah/en.json',
    category: 'after-salah',
  },
  {
    url: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr/morning-dhikr/en.json',
    category: 'morning',
  },
  {
    url: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr/evening-dhikr/en.json',
    category: 'evening',
  },
  {
    url: 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data/dua-dhikr/selected-dua/en.json',
    category: 'selected',
  },
];

const seedDuas = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quran_app';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected');

    // Clear existing duas
    await Dua.deleteMany({});
    logger.info('Cleared existing duas');

    let totalDuas = 0;

    for (const source of DUA_SOURCES) {
      try {
        logger.info(`Fetching duas from ${source.url}`);
        const response = await axios.get(source.url);
        const duas = response.data;

        if (!Array.isArray(duas)) {
          logger.warn(`Invalid data format from ${source.url}`);
          continue;
        }

        const duasToInsert = duas.map((dua: any) => ({
          title: dua.title,
          category: source.category,
          arabic: dua.arabic,
          latin: dua.latin,
          transliteration: dua.latin, // Using latin as transliteration
          translation: dua.translation,
          notes: dua.notes,
          benefits: dua.benefits || dua.fawaid,
          source: dua.source,
          tags: extractTags(dua.title),
        }));

        await Dua.insertMany(duasToInsert);
        totalDuas += duasToInsert.length;
        logger.info(`Inserted ${duasToInsert.length} duas from ${source.category} category`);
      } catch (error) {
        logger.error(`Error fetching duas from ${source.url}:`, error);
      }
    }

    logger.info(`Successfully seeded ${totalDuas} duas`);
    process.exit(0);
  } catch (error) {
    logger.error('Seed duas error:', error);
    process.exit(1);
  }
};

// Extract tags from title
const extractTags = (title: string): string[] => {
  const tags: string[] = [];
  const lowerTitle = title.toLowerCase();

  const keywords = [
    'sleeping', 'waking', 'bathroom', 'eating', 'mosque', 'ablution', 'prayer',
    'morning', 'evening', 'travel', 'rain', 'anxiety', 'debt', 'forgiveness',
    'protection', 'adhan', 'parents', 'health', 'knowledge', 'guidance',
  ];

  keywords.forEach(keyword => {
    if (lowerTitle.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return tags;
};

seedDuas();

