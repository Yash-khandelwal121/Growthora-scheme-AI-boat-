const { GoogleGenAI } = require('@google/genai');

let _client = null;

function isGeminiConfigured() {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() &&
    process.env.GEMINI_MODEL?.trim()
  );
}

function getGeminiClient() {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini is not configured. Missing API key or model.");
  }
  
  if (!_client) {
    _client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY.trim(),
    });
  }
  
  return _client;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-pro';
}

module.exports = {
  isGeminiConfigured,
  getGeminiClient,
  getGeminiModel
};
