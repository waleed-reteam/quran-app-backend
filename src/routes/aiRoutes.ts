import express from 'express';
import { search, chat, askQuestion } from '../controllers/aiController';
import { optional } from '../middleware/auth';

const router = express.Router();

router.get('/search', optional, search);
router.post('/chat', optional, chat);
router.post('/ask', optional, askQuestion);

export default router;

