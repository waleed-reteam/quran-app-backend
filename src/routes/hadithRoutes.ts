import express from 'express';
import {
  getAllCollections,
  getHadithsByCollection,
  getHadithById,
  searchHadiths,
  getChapters,
  getHadithsByChapter,
} from '../controllers/hadithController';
import { optional } from '../middleware/auth';

const router = express.Router();

router.get('/collections', optional, getAllCollections);
router.get('/collections/:collection', optional, getHadithsByCollection);
router.get('/books/:bookSlug/chapters', optional, getChapters);
router.get('/books/:bookSlug/chapters/:chapterNumber', optional, getHadithsByChapter);
router.get('/search', optional, searchHadiths);
router.get('/:id', optional, getHadithById);

export default router;

