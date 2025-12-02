import express from 'express';
import authRoutes from './authRoutes';
import quranRoutes from './quranRoutes';
import hadithRoutes from './hadithRoutes';
import duaRoutes from './duaRoutes';
import prayerRoutes from './prayerRoutes';
import bookmarkRoutes from './bookmarkRoutes';
import aiRoutes from './aiRoutes';
import docsRoutes from './docsRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/quran', quranRoutes);
router.use('/hadiths', hadithRoutes);
router.use('/duas', duaRoutes);
router.use('/prayer', prayerRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/ai', aiRoutes);
router.use('/docs', docsRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;

