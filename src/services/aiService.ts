import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import logger from '../utils/logger';
import Dua from '../models/mongodb/Dua';
import { getAyah, getSurah } from './quranApiService';
import { getHadithById, transformHadith } from './hadithApiService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let pinecone: Pinecone | null = null;
let pineconeIndex: any = null;

// Initialize Pinecone
export const initializePinecone = async () => {
  try {
    if (!process.env.PINECONE_API_KEY) {
      logger.warn('Pinecone API key not found. Vector search will be disabled.');
      return;
    }

    // Pinecone v1+ only requires apiKey, environment is no longer needed
    // Using type assertion to bypass strict type checking for PineconeConfiguration
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: '', // Required by type but not used in v1+
    } as { apiKey: string; environment: string });

    const indexName = process.env.PINECONE_INDEX_NAME || 'islamic-content';
    pineconeIndex = pinecone.index(indexName);
    
    logger.info('Pinecone initialized successfully');
  } catch (error) {
    logger.error('Pinecone initialization error:', error);
  }
};

// Generate embeddings using OpenAI
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Generate embedding error:', error);
    throw error;
  }
};

// AI-powered semantic search
export const semanticSearch = async (query: string, contentType?: string, limit: number = 10) => {
  try {
    if (!pineconeIndex) {
      throw new Error('Pinecone not initialized');
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search in Pinecone
    const filter: any = {};
    if (contentType) {
      filter.contentType = contentType;
    }

    const searchResults = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      filter,
    });

    // Fetch full content from APIs (Quran, Hadith) or MongoDB (Duas)
    const results = await Promise.all(
      searchResults.matches.map(async (match: any) => {
        const { contentType, contentId } = match.metadata;

        let content = null;
        try {
          if (contentType === 'quran') {
            // Fetch from Quran API
            const ayah = await getAyah(contentId);
            if (ayah) {
              // Extract surah number from contentId (format: surah:ayah or ayahNumber)
              let surahNumber: number | undefined;
              let surahName: string | undefined;
              
              if (contentId.includes(':')) {
                surahNumber = parseInt(contentId.split(':')[0]);
                // Fetch surah info to get name
                try {
                  const surah = await getSurah(surahNumber);
                  if (surah) {
                    surahName = surah.englishName;
                  }
                } catch (error) {
                  logger.debug(`Could not fetch surah ${surahNumber} info:`, error);
                }
              }
              
              content = {
                ...ayah,
                surahNumber,
                surahName: surahName || (surahNumber ? `Surah ${surahNumber}` : undefined),
              };
            }
          } else if (contentType === 'hadith') {
            // Fetch from Hadith API
            const hadithId = parseInt(contentId);
            if (!isNaN(hadithId)) {
              const hadith = await getHadithById(hadithId);
              if (hadith) {
                content = transformHadith(hadith);
              }
            }
          } else if (contentType === 'dua') {
            // Fetch from MongoDB (Duas are still in MongoDB)
            content = await Dua.findById(contentId);
          }
        } catch (error) {
          logger.error(`Error fetching content ${contentType}:${contentId}:`, error);
        }

        return {
          score: match.score,
          contentType,
          content,
        };
      })
    );

    return results.filter(r => r.content !== null);
  } catch (error) {
    logger.error('Semantic search error:', error);
    throw error;
  }
};

// AI-powered chat for Islamic questions
export const aiChat = async (messages: Array<{ role: string; content: string }>) => {
  try {
    const systemPrompt = `You are an Islamic scholar assistant with deep knowledge of the Quran, Hadith, and Islamic teachings. 
    Provide accurate, respectful, and helpful responses based on authentic Islamic sources. 
    Always cite sources when possible (Quran verses, Hadith collections, etc.).
    If you're unsure about something, acknowledge it and suggest consulting a qualified scholar.`;

    const typedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' 
          ? msg.role 
          : 'user') as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: typedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    logger.error('AI chat error:', error);
    throw error;
  }
};

// Generate embeddings for content and store in Pinecone
export const indexContent = async (contentType: string, contentId: string, text: string, metadata: any = {}) => {
  try {
    if (!pineconeIndex) {
      logger.warn('Pinecone not initialized. Skipping indexing.');
      return;
    }

    const embedding = await generateEmbedding(text);

    await pineconeIndex.upsert([
      {
        id: `${contentType}:${contentId}`,
        values: embedding,
        metadata: {
          contentType,
          contentId,
          ...metadata,
        },
      },
    ]);

    logger.info(`Indexed ${contentType}:${contentId}`);
  } catch (error) {
    logger.error('Index content error:', error);
  }
};

// Batch index content
export const batchIndexContent = async (items: Array<{ contentType: string; contentId: string; text: string; metadata?: any }>) => {
  try {
    if (!pineconeIndex) {
      logger.warn('Pinecone not initialized. Skipping batch indexing.');
      return;
    }

    const vectors = await Promise.all(
      items.map(async (item) => {
        const embedding = await generateEmbedding(item.text);
        return {
          id: `${item.contentType}:${item.contentId}`,
          values: embedding,
          metadata: {
            contentType: item.contentType,
            contentId: item.contentId,
            ...item.metadata,
          },
        };
      })
    );

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeIndex.upsert(batch);
      logger.info(`Indexed batch ${i / batchSize + 1} of ${Math.ceil(vectors.length / batchSize)}`);
    }

    logger.info(`Batch indexed ${vectors.length} items`);
  } catch (error) {
    logger.error('Batch index content error:', error);
  }
};
