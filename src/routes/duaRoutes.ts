import express from 'express';
import {
  getAllDuas,
  getDuaById,
  getDuasByCategory,
  searchDuas,
  getCategories,
} from '../controllers/duaController';
import { optional } from '../middleware/auth';

const router = express.Router();

router.get('/', optional, getAllDuas);
router.get('/categories', optional, getCategories);
router.get('/categories/:category', optional, getDuasByCategory);
router.get('/search', optional, searchDuas);
router.get('/:id', optional, getDuaById);

export default router;

