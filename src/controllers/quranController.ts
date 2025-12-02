import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  getSurahsList,
  getSurah,
  getSurahMultipleEditions,
  getAyah,
  getAyahMultipleEditions,
  getJuz as getJuzFromApi,
  getPage as getPageFromApi,
  getManzil as getManzilFromApi,
  getRuku as getRukuFromApi,
  getHizbQuarter as getHizbQuarterFromApi,
  getSajdaAyahs as getSajdaAyahsFromApi,
  searchQuran as searchQuranFromApi,
  getMeta as getMetaFromApi,
  getEditions as getEditionsFromApi,
  getDefaultEditions as getDefaultEditionsFromApi,
} from '../services/quranApiService';

export const getAllSurahs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const surahs = await getSurahsList();

    res.status(200).json({
      success: true,
      data: surahs,
    });
  } catch (error) {
    logger.error('Get all surahs error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getSurahByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { number } = req.params;
    const { edition, editions } = req.query;

    // If multiple editions requested
    if (editions && typeof editions === 'string') {
      const editionList = editions.split(',');
      const result = await getSurahMultipleEditions(parseInt(number), editionList);
      
      res.status(200).json({
        success: true,
        data: result,
      });
      return;
    }

    // Single edition
    const editionId = (edition as string) || undefined;
    const surah = await getSurah(parseInt(number), editionId);

    if (!surah) {
      res.status(404).json({
        success: false,
        message: 'Surah not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: surah,
    });
  } catch (error) {
    logger.error('Get surah by number error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getAyahByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { surahNumber, ayahNumber } = req.params;
    const { edition, editions } = req.query;
    const reference = `${surahNumber}:${ayahNumber}`;

    // If multiple editions requested
    if (editions && typeof editions === 'string') {
      const editionList = editions.split(',');
      const result = await getAyahMultipleEditions(reference, editionList);
      
      res.status(200).json({
        success: true,
        data: result,
      });
      return;
    }

    // Single edition
    const editionId = (edition as string) || undefined;
    const ayah = await getAyah(reference, editionId);

    if (!ayah) {
      res.status(404).json({
        success: false,
        message: 'Ayah not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: ayah,
    });
  } catch (error) {
    logger.error('Get ayah by number error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getAyahByReference = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;
    const { edition, editions } = req.query;

    // If multiple editions requested
    if (editions && typeof editions === 'string') {
      const editionList = editions.split(',');
      const result = await getAyahMultipleEditions(reference, editionList);
      
      res.status(200).json({
        success: true,
        data: result,
      });
      return;
    }

    // Single edition
    const editionId = (edition as string) || undefined;
    const ayah = await getAyah(reference, editionId);

    if (!ayah) {
      res.status(404).json({
        success: false,
        message: 'Ayah not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: ayah,
    });
  } catch (error) {
    logger.error('Get ayah by reference error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const searchQuran = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, surah = 'all', edition, language } = req.query;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query required',
      });
      return;
    }

    const surahParam = surah === 'all' ? 'all' : parseInt(surah as string);
    const results = await searchQuranFromApi(
      query as string,
      surahParam,
      edition as string | undefined,
      language as string | undefined
    );

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('Search Quran error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getJuz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { juzNumber } = req.params;
    const { edition, offset, limit } = req.query;

    const ayahs = await getJuzFromApi(
      parseInt(juzNumber),
      edition as string | undefined,
      offset ? parseInt(offset as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: ayahs,
      count: ayahs.length,
    });
  } catch (error) {
    logger.error('Get juz error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageNumber } = req.params;
    const { edition, offset, limit } = req.query;

    const ayahs = await getPageFromApi(
      parseInt(pageNumber),
      edition as string | undefined,
      offset ? parseInt(offset as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: ayahs,
      count: ayahs.length,
    });
  } catch (error) {
    logger.error('Get page error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getManzil = async (req: Request, res: Response): Promise<void> => {
  try {
    const { manzilNumber } = req.params;
    const { edition, offset, limit } = req.query;

    const ayahs = await getManzilFromApi(
      parseInt(manzilNumber),
      edition as string | undefined,
      offset ? parseInt(offset as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: ayahs,
      count: ayahs.length,
    });
  } catch (error) {
    logger.error('Get manzil error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getRuku = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rukuNumber } = req.params;
    const { edition, offset, limit } = req.query;

    const ayahs = await getRukuFromApi(
      parseInt(rukuNumber),
      edition as string | undefined,
      offset ? parseInt(offset as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: ayahs,
      count: ayahs.length,
    });
  } catch (error) {
    logger.error('Get ruku error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getHizbQuarter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hizbNumber } = req.params;
    const { edition, offset, limit } = req.query;

    const ayahs = await getHizbQuarterFromApi(
      parseInt(hizbNumber),
      edition as string | undefined,
      offset ? parseInt(offset as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: ayahs,
      count: ayahs.length,
    });
  } catch (error) {
    logger.error('Get hizb quarter error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getSajdaAyahs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { edition } = req.query;

    const ayahs = await getSajdaAyahsFromApi(edition as string | undefined);

    res.status(200).json({
      success: true,
      data: ayahs,
      count: ayahs.length,
    });
  } catch (error) {
    logger.error('Get sajda ayahs error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getMeta = async (_req: Request, res: Response): Promise<void> => {
  try {
    const meta = await getMetaFromApi();

    if (!meta) {
      res.status(404).json({
        success: false,
        message: 'Meta data not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: meta,
    });
  } catch (error) {
    logger.error('Get meta error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getEditions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, language, type } = req.query;

    const filters: any = {};
    if (format) filters.format = format;
    if (language) filters.language = language;
    if (type) filters.type = type;

    const editions = await getEditionsFromApi(filters);

    res.status(200).json({
      success: true,
      data: editions,
      count: editions.length,
    });
  } catch (error) {
    logger.error('Get editions error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

export const getDefaultEditions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const defaults = getDefaultEditionsFromApi();

    res.status(200).json({
      success: true,
      data: defaults,
    });
  } catch (error) {
    logger.error('Get default editions error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};
