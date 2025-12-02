import express from 'express';
import {
  createBookmark,
  getBookmarks,
  getBookmarkById,
  updateBookmark,
  deleteBookmark,
  checkBookmark,
} from '../controllers/bookmarkController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, createBookmark);
router.get('/', protect, getBookmarks);
router.get('/check', protect, checkBookmark);
router.get('/:id', protect, getBookmarkById);
router.put('/:id', protect, updateBookmark);
router.delete('/:id', protect, deleteBookmark);

export default router;

