const { getGroqClient, getResearchFallbackModels, isGroqConfigured } = require('../config/groq');
const { geminiPrompt } = require('../prompts/geminiResearchPrompt');
const { parseAIJson } = require('../utils/parseAIJson');
const { logInfo } = require('../utils/logger');
const { withGroqRetry } = require('../utils/groqRetry');
const { researchSchema } = require('../utils/researchSchema');

async function runGroqSecondaryResearch(researchContext) {
  if (!isGroqConfigured()) {
    throw new Error('Groq is not configured');
  }

  const groqClient = getGroqClient();
  const fallbackModels = getResearchFallbackModels();

  logInfo('Starting Groq Research B', { schemeName: researchContext.schemeName });

  const systemPrompt = geminiPrompt.replace('{{RESEARCH_CONTEXT}}', JSON.stringify(researchContext, null, 2));

  return await withGroqRetry('Groq Research B', fallbackModels, async (currentModel, attempt) => {
    const requestConfig = {
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Research the requested scheme and return the JSON. Remember to set live-officially-verified to false and omit unknown URLs since live web research is OFF.' }
      ],
      temperature: 0.1,
      max_tokens: 8000,
    };
    if (attempt === 0) {
      requestConfig.response_format = { type: "json_schema", json_schema: { name: researchSchema.name, schema: researchSchema.schema, strict: true } };
    }
    const response = await groqClient.chat.completions.create(requestConfig);

    const content = response.choices[0].message.content || response.choices[0].message.reasoning || '';
    const parsedData = parseAIJson(content);
    
    logInfo('Groq Research B completed successfully');
    return parsedData;
  });
}

module.exports = {
  runGroqSecondaryResearch
};
