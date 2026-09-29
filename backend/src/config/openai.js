const { OpenAI } = require('openai');

let _client = null;

function isOpenAIConfigured() {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() &&
    process.env.OPENAI_MODEL?.trim()
  );
}

function getOpenAIClient() {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI is not configured. Missing API key or model.");
  }
  
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY.trim(),
    });
  }
  
  return _client;
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o';
}

module.exports = {
  isOpenAIConfigured,
  getOpenAIClient,
  getOpenAIModel
};
