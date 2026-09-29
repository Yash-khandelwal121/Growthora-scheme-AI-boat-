require('dotenv').config({ path: '.env' });
const { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } = require('../src/config/openai');
const { getGeminiClient, getGeminiModel, isGeminiConfigured } = require('../src/config/gemini');
const { getAnthropicClient, getAnthropicModel, isAnthropicConfigured } = require('../src/config/anthropic');

async function testOpenAI() {
  const result = { provider: 'OpenAI', connected: false, model: process.env.OPENAI_MODEL, error: null };
  if (!isOpenAIConfigured()) {
    result.error = 'Not configured';
    return result;
  }
  try {
    const client = getOpenAIClient();
    const model = getOpenAIModel();
    result.model = model;
    const response = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: 'Reply only with OK' }],
      max_tokens: 5
    });
    if (response.choices && response.choices.length > 0) {
      result.connected = true;
    } else {
      result.error = 'Invalid response structure';
    }
  } catch (err) {
    result.error = err.status ? '[' + err.status + '] ' + (err.error?.message || err.message) : err.message;
  }
  return result;
}

async function testGemini() {
  const result = { provider: 'Gemini', connected: false, model: process.env.GEMINI_MODEL, error: null };
  if (!isGeminiConfigured()) {
    result.error = 'Not configured';
    return result;
  }
  try {
    const client = getGeminiClient();
    const model = getGeminiModel();
    result.model = model;
    const response = await client.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: 'Reply only with OK' }] }]
    });
    if (response.text) {
      result.connected = true;
    } else {
      result.error = 'Invalid response structure';
    }
  } catch (err) {
    result.error = err.status ? '[' + err.status + '] ' + err.message : err.message;
  }
  return result;
}

async function testAnthropic() {
  const result = { provider: 'Anthropic', connected: false, model: process.env.ANTHROPIC_MODEL, error: null };
  if (!isAnthropicConfigured()) {
    result.error = 'Not configured';
    return result;
  }
  try {
    const client = getAnthropicClient();
    const model = getAnthropicModel();
    result.model = model;
    const response = await client.messages.create({
      model: model,
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Reply only with OK' }]
    });
    if (response.content && response.content.length > 0) {
      result.connected = true;
    } else {
      result.error = 'Invalid response structure';
    }
  } catch (err) {
    result.error = err.status ? '[' + err.status + '] ' + (err.error?.error?.message || err.error?.message || err.message) : err.message;
  }
  return result;
}

async function runTests() {
  console.log("Starting minimal provider connection tests...");
  const results = await Promise.all([testOpenAI(), testGemini(), testAnthropic()]);
  console.log(JSON.stringify(results, null, 2));
}

runTests();
