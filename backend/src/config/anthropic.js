const Anthropic = require('@anthropic-ai/sdk');

let _client = null;

function isAnthropicConfigured() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() &&
    process.env.ANTHROPIC_MODEL?.trim()
  );
}

function getAnthropicClient() {
  if (!isAnthropicConfigured()) {
    throw new Error("Anthropic is not configured. Missing API key or model.");
  }
  
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY.trim(),
    });
  }
  
  return _client;
}

function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-7-sonnet-20250219';
}

module.exports = {
  isAnthropicConfigured,
  getAnthropicClient,
  getAnthropicModel
};
