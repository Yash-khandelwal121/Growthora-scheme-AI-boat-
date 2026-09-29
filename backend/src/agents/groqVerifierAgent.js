const { getGroqClient, getVerifierFallbackModels, isGroqConfigured } = require('../config/groq');
const { claudePrompt } = require('../prompts/claudeVerifierPrompt');
const { parseAIJson } = require('../utils/parseAIJson');
const { logInfo } = require('../utils/logger');
const { withGroqRetry } = require('../utils/groqRetry');
const { researchSchema } = require('../utils/researchSchema');

async function runGroqVerification(researchA, researchB, context) {
  if (!isGroqConfigured()) {
    throw new Error('Groq is not configured');
  }

  const groqClient = getGroqClient();
  const fallbackModels = getVerifierFallbackModels();

  logInfo('Starting Groq Verification', { schemeName: context.schemeName });

  const systemPrompt = claudePrompt
    .replace('{{RESEARCH_CONTEXT}}', JSON.stringify(context, null, 2))
    .replace('{{RESEARCH_A}}', JSON.stringify(researchA, null, 2))
    .replace('{{RESEARCH_B}}', JSON.stringify(researchB, null, 2));

  return await withGroqRetry('Groq Verification', fallbackModels, async (currentModel, attempt) => {
    const requestConfig = {
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Act as the Master Fact Resolver. Resolve conflicts and output the final verified JSON. Remember to set live-officially-verified to false and omit unknown URLs.' }
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
    
    logInfo('Groq Verification completed successfully');
    return parsedData;
  });
}

module.exports = {
  runGroqVerification
};
