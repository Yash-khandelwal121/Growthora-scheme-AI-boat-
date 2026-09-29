const { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } = require('../config/openai');
const { openaiPrompt } = require('../prompts/openaiResearchPrompt');
const { parseAIJson } = require('../utils/parseAIJson');
const { logError, logInfo } = require('../utils/logger');
const { parseProviderError } = require('../utils/providerErrorCategories');

async function runOpenAIResearch(researchContext) {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  const openaiClient = getOpenAIClient();
  const defaultModel = getOpenAIModel();

  logInfo('Starting OpenAI Research', { schemeName: researchContext.schemeName });

  const systemPrompt = openaiPrompt.replace('{{RESEARCH_CONTEXT}}', JSON.stringify(researchContext, null, 2));

  try {
    const response = await openaiClient.chat.completions.create({
      model: defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Research the requested scheme and return the JSON.' }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      tools: [{ type: "web_search" }]
    });

    const content = response.choices[0].message.content;
    const parsedData = parseAIJson(content);
    
    logInfo('OpenAI Research completed successfully');
    return parsedData;
  } catch (error) {
    const parsedError = parseProviderError(error, 'OpenAI');
    logError('OpenAI Research failed', parsedError);
    throw parsedError;
  }
}

module.exports = {
  runOpenAIResearch
};
