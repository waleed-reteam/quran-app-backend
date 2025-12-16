import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../utils/logger';

const HADITH_URLS = {
  'sahih-bukhari': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/bukhari.json',
  'sahih-muslim': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/muslim.json',
  'sunan-an-nasai': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/nasai.json',
  'sunan-abu-dawud': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/abudawud.json',
  'jami-at-tirmidhi': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/tirmidhi.json',
  'sunan-ibn-majah': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/ibnmajah.json',
  'muwatta-malik': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/malik.json',
  'musnad-ahmad': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/ahmed.json',
  'sunan-darimi': 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/darimi.json',
};

const DOWNLOAD_DIR = path.join(__dirname, '../data/hadiths');

const downloadFile = async (name: string, url: string) => {
  try {
    const filePath = path.join(DOWNLOAD_DIR, `${name}.json`);
    logger.info(`Downloading ${name} from ${url}...`);
    
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', reject);
    });
  } catch (error) {
    logger.error(`Error downloading ${name}:`, error);
    throw error;
  }
};

const downloadAll = async () => {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  for (const [name, url] of Object.entries(HADITH_URLS)) {
    await downloadFile(name, url);
    logger.info(`✅ Downloaded ${name}`);
  }
  logger.info('All files downloaded successfully.');
};

downloadAll().catch(console.error);
