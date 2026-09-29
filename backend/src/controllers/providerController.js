const openaiConfig = require('../config/openai');
const geminiConfig = require('../config/gemini');
const anthropicConfig = require('../config/anthropic');
const groqConfig = require('../config/groq');
const tavilyConfig = require('../config/tavily');

exports.getProviderStatus = (req, res) => {
  res.json({
    success: true,
    providers: {
      openai: {
        configured: openaiConfig.isOpenAIConfigured()
      },
      gemini: {
        configured: geminiConfig.isGeminiConfigured()
      },
      anthropic: {
        configured: anthropicConfig.isAnthropicConfigured()
      },
      groq: {
        configured: groqConfig.isGroqConfigured(),
        freeLiveTestEnabled: groqConfig.isFreeLiveTestEnabled(),
        liveWebResearchEnabled: groqConfig.isGroqLiveWebResearchEnabled(),
        researchPrimaryModel: groqConfig.getGroqResearchPrimaryModel(),
        researchFallbackModel: groqConfig.getGroqResearchFallbackModel(),
        verifierModel: groqConfig.getGroqVerifierModel(),
        contentPrimaryModel: groqConfig.getGroqContentPrimaryModel(),
        contentFallbackModel: groqConfig.getGroqContentFallbackModel(),
        heavyFallbackModel: groqConfig.getGroqHeavyFallbackModel(),
        safetyModel: groqConfig.getGroqSafetyModel()
      },
      tavily: {
        configured: tavilyConfig.isTavilyConfigured(),
        liveSearchEnabled: tavilyConfig.isTavilyLiveSearchEnabled()
      }
    }
  });
};

exports.testGroq = async (req, res) => {
  try {
    if (!groqConfig.isGroqConfigured()) {
      return res.status(400).json({ success: false, message: 'Groq is not configured.' });
    }
    const client = groqConfig.getGroqClient();
    const model = groqConfig.getGroqResearchModel();
    
    // minimal single token request
    await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 2
    });
    
    res.json({
      success: true,
      provider: 'groq',
      model
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
