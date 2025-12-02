import { Request, Response } from 'express';
import { semanticSearch, aiChat } from '../services/aiService';
import logger from '../utils/logger';

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, contentType, limit = 10 } = req.query;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
      return;
    }

    const results = await semanticSearch(
      query as string,
      contentType as string | undefined,
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('AI search error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({
        success: false,
        message: 'Messages array is required',
      });
      return;
    }

    const response = await aiChat(messages);

    res.status(200).json({
      success: true,
      data: {
        response,
      },
    });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const askQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;

    if (!question) {
      res.status(400).json({
        success: false,
        message: 'Question is required',
      });
      return;
    }

    // First, do semantic search to find relevant content
    const relevantContent = await semanticSearch(question, undefined, 5);

    // Build context from relevant content
    let context = 'Here is some relevant Islamic content:\n\n';
    relevantContent.forEach((item, index) => {
      if (item.contentType === 'quran' && item.content) {
        const surahInfo = item.content.surahName 
          ? `${item.content.surahName} (${item.content.surahNumber}:${item.content.numberInSurah})`
          : `Ayah ${item.content.numberInSurah || item.content.number}`;
        context += `${index + 1}. Quran ${surahInfo}: ${item.content.text}\n\n`;
      } else if (item.contentType === 'hadith' && item.content) {
        const collection = item.content.collection || item.content.bookInfo?.slug || 'Unknown';
        context += `${index + 1}. Hadith from ${collection}: ${item.content.englishText || item.content.text}\n\n`;
      } else if (item.contentType === 'dua' && item.content) {
        context += `${index + 1}. Dua - ${item.content.title}: ${item.content.translation}\n\n`;
      }
    });

    // Get AI response with context
    const messages = [
      { role: 'user', content: `${context}\nQuestion: ${question}` },
    ];

    const response = await aiChat(messages);

    res.status(200).json({
      success: true,
      data: {
        question,
        answer: response,
        relevantContent,
      },
    });
  } catch (error) {
    logger.error('Ask question error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

