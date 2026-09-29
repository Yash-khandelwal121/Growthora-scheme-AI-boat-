require('dotenv').config();

const { isOpenAIConfigured } = require('./src/config/openai');
const { isGeminiConfigured } = require('./src/config/gemini');
const { isAnthropicConfigured } = require('./src/config/anthropic');

console.log({
  openaiKey: !!process.env.OPENAI_API_KEY?.trim(),
  openaiModel: !!process.env.OPENAI_MODEL?.trim(),
  geminiKey: !!process.env.GEMINI_API_KEY?.trim(),
  geminiModel: !!process.env.GEMINI_MODEL?.trim(),
  anthropicKey: !!process.env.ANTHROPIC_API_KEY?.trim(),
  anthropicModel: !!process.env.ANTHROPIC_MODEL?.trim(),
  isOpenAIConfigured: isOpenAIConfigured(),
  isGeminiConfigured: isGeminiConfigured(),
  isAnthropicConfigured: isAnthropicConfigured()
});
