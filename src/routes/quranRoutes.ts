import express from 'express';
import {
  getAllSurahs,
  getSurahByNumber,
  getAyahByNumber,
  getAyahByReference,
  searchQuran,
  getJuz,
  getPage,
  getManzil,
  getRuku,
  getHizbQuarter,
  getSajdaAyahs,
  getMeta,
  getEditions,
  getDefaultEditions,
} from '../controllers/quranController';
import { optional } from '../middleware/auth';

const router = express.Router();

// Editions
router.get('/editions', optional, getEditions);
router.get('/editions/default', optional, getDefaultEditions);

// Meta
router.get('/meta', optional, getMeta);

// Surahs
router.get('/surahs', optional, getAllSurahs);
router.get('/surahs/:number', optional, getSurahByNumber);

// Ayahs
router.get('/surahs/:surahNumber/ayahs/:ayahNumber', optional, getAyahByNumber);
router.get('/ayahs/:reference', optional, getAyahByReference);

// Search
router.get('/search', optional, searchQuran);

// Juz, Page, Manzil, Ruku, Hizb
router.get('/juz/:juzNumber', optional, getJuz);
router.get('/page/:pageNumber', optional, getPage);
router.get('/manzil/:manzilNumber', optional, getManzil);
router.get('/ruku/:rukuNumber', optional, getRuku);
router.get('/hizb/:hizbNumber', optional, getHizbQuarter);

// Sajda
router.get('/sajda', optional, getSajdaAyahs);

export default router;
