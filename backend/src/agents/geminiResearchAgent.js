const { getGeminiClient, getGeminiModel, isGeminiConfigured } = require('../config/gemini');
const { geminiPrompt } = require('../prompts/geminiResearchPrompt');
const { parseAIJson } = require('../utils/parseAIJson');
const { logError, logInfo } = require('../utils/logger');
const { parseProviderError } = require('../utils/providerErrorCategories');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runGeminiResearch(researchContext) {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini is not configured');
  }

  const geminiClient = getGeminiClient();
  const defaultModel = getGeminiModel();

  logInfo('Starting Gemini Research', { schemeName: researchContext.schemeName });

  const systemPrompt = geminiPrompt.replace('{{RESEARCH_CONTEXT}}', JSON.stringify(researchContext, null, 2));

  const maxRetries = 2;
  const retryDelays = [2000, 5000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await geminiClient.models.generateContent({
        model: defaultModel,
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nPlease perform the research and return the JSON.' }] }
        ],
        config: {
          temperature: 0.1,
          tools: [{ googleSearch: {} }]
        }
      });

      const content = response.text;
      const parsedData = parseAIJson(content);
      
      if (response.candidates && response.candidates[0].groundingMetadata && response.candidates[0].groundingMetadata.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const sources = [];
        chunks.forEach(chunk => {
          if (chunk.web && chunk.web.uri) {
            sources.push({
              url: chunk.web.uri,
              title: chunk.web.title || null,
              supportsFacts: []
            });
          }
        });
        if (sources.length > 0) {
          parsedData.sources = parsedData.sources || [];
          parsedData.sources.push(...sources);
        }
      }

      logInfo('Gemini Research completed successfully');
      return parsedData;

    } catch (error) {
      const parsedError = parseProviderError(error, 'Gemini');
      
      if (parsedError.category === 'temporary_unavailable' && attempt < maxRetries) {
        logInfo("Gemini temporary error, retrying... (" + (attempt + 1) + "/" + maxRetries + ")");
        await delay(retryDelays[attempt]);
        continue;
      }
      
      logError('Gemini Research failed', parsedError);
      throw parsedError;
    }
  }
}

module.exports = {
  runGeminiResearch
};
