require('dotenv').config({ path: '.env' });
process.env.USE_MOCK_RESEARCH = "true";

const { performResearch } = require('../src/services/researchService');
const openaiConfig = require('../src/config/openai');
const geminiConfig = require('../src/config/gemini');
const anthropicConfig = require('../src/config/anthropic');

async function runTests() {
  console.log("Testing Mock Mode Safety (No Paid API Calls)...");

  let openaiCalled = false;
  let geminiCalled = false;
  let anthropicCalled = false;

  const originalGetOpenAI = openaiConfig.getOpenAIClient;
  const originalGetGemini = geminiConfig.getGeminiClient;
  const originalGetAnthropic = anthropicConfig.getAnthropicClient;

  openaiConfig.getOpenAIClient = () => { openaiCalled = true; return {}; };
  geminiConfig.getGeminiClient = () => { geminiCalled = true; return {}; };
  anthropicConfig.getAnthropicClient = () => { anthropicCalled = true; return {}; };

  const input = {
    schemeName: "PMEGP",
    primaryKeyword: "PMEGP Scheme 2026",
    secondaryKeywords: ["PMEGP eligibility"],
    location: "India",
    outcome: "Complete Scheme Guide",
    language: "English"
  };

  try {
    const result = await performResearch(input);
    
    if (openaiCalled || geminiCalled || anthropicCalled) {
      console.error("❌ Test failed: Client getters WERE invoked during mock mode!");
    } else {
      console.log("✅ Test passed: Client getters were NOT invoked.");
    }
    
    if (result.mode === "mock" && result.liveResearch === false) {
      console.log("✅ Test passed: Result contains mock metadata.");
    } else {
      console.error("❌ Test failed: Result is missing mock metadata.");
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    openaiConfig.getOpenAIClient = originalGetOpenAI;
    geminiConfig.getGeminiClient = originalGetGemini;
    anthropicConfig.getAnthropicClient = originalGetAnthropic;
  }
}

runTests();
