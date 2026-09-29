const { ResearchRequestSchema } = require('../schemas/researchSchemas');
const { performResearch } = require('../services/researchService');
const { logError } = require('../utils/logger');
const { saveResearchCache, loadResearchCache } = require('../utils/researchCache');

exports.generateScheme = (req, res) => {
  const { schemeName, primaryKeyword, secondaryKeywords, location, outcome, language } = req.body;

  if (!schemeName || !primaryKeyword || !secondaryKeywords || !location || !outcome || !language) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  return res.status(200).json({
    success: true,
    message: "Scheme generation pipeline initialized",
    data: { schemeName, status: "initialized" }
  });
};

exports.researchScheme = async (req, res) => {
  try {
    // Validate input using Zod
    const validatedData = ResearchRequestSchema.parse(req.body);
    const slug = validatedData.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if cache already exists and matches signature
    const cachedResearch = loadResearchCache(slug, validatedData);
    if (cachedResearch) {
      return res.status(200).json({
        success: true,
        message: "Verified research already available",
        cached: true,
        data: cachedResearch
      });
    }

    // Perform Research
    const masterResearch = await performResearch(validatedData);
    
    if (masterResearch && masterResearch.researchId) {
      saveResearchCache(slug, masterResearch, validatedData);
    }
    
    return res.status(200).json({
      success: true,
      message: "Scheme research completed",
      data: masterResearch
    });
  } catch (error) {
    logError('Research route error', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid input data', details: error.errors });
    }
    if (error.customPayload) {
      return res.status(error.statusCode || 500).json(error.customPayload);
    }
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Internal server error during research' });
  }
};

const { generateArticle } = require('../services/contentService');

exports.generateContent = async (req, res) => {
  try {
    let { research, slug } = req.body;
    
    if (!research && slug) {
      research = loadResearchCache(slug);
    }
    
    if (!research || !research.researchId) {
      return res.status(400).json({ success: false, message: 'Invalid or incomplete master research data' });
    }

    const finalArticle = await generateArticle(research);
    
    if (finalArticle && finalArticle.success === false) {
      const statusCode = finalArticle.errorCategory === "INSUFFICIENT_CRITICAL_FACT_COVERAGE" || 
                         finalArticle.errorCategory === "INSUFFICIENT_OFFICIAL_EVIDENCE" ? 422 : 400;
      return res.status(statusCode).json(finalArticle);
    }
    
    return res.status(200).json({
      success: true,
      message: "Article generation completed",
      data: finalArticle
    });
  } catch (error) {
    logError('Content generation route error', error);
    if (error.customPayload) {
      return res.status(error.statusCode || 500).json(error.customPayload);
    }
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Internal server error during content generation' });
  }
};
