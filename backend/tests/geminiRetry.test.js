require('dotenv').config({ path: '.env' });
const geminiAgent = require('../src/agents/geminiResearchAgent');
const geminiConfig = require('../src/config/gemini');

// The function we want to mock is actually inside the client.
// Since dotenv is loaded, getGeminiClient() will return the real client if configured.
// But we want to mock its `generateContent` method.
async function runTests() {
  console.log("Testing Gemini bounded retry logic for 503 errors...");
  const start = Date.now();
  
  let originalClient;
  try {
    originalClient = geminiConfig.getGeminiClient();
  } catch (e) {
    console.error("Test setup failed: Gemini client could not be loaded. Please ensure .env has dummy values if running in CI.", e);
    return;
  }

  const originalGenerateContent = originalClient.models.generateContent;

  originalClient.models.generateContent = async () => {
    throw { status: 503, message: 'High demand' };
  };

  try {
    await geminiAgent.runGeminiResearch({ schemeName: 'Test' });
    console.error("❌ Test failed: Gemini research should have thrown an error after retries.");
  } catch (error) {
    const elapsed = Date.now() - start;
    if (error.category === 'temporary_unavailable') {
      if (elapsed > 6000) {
         console.log("✅ Test passed: Gemini bounded retry logic triggered correctly (took ~" + Math.round(elapsed/1000) + "s).");
      } else {
         console.error("❌ Test failed: Retries did not take long enough. Elapsed: " + elapsed + "ms");
      }
    } else {
      console.error("❌ Test failed: Expected temporary_unavailable, got " + error.category);
    }
  }

  console.log("\nTesting Gemini no-retry for billing failures...");
  originalClient.models.generateContent = async () => {
    throw { status: 429, message: 'Quota exceeded' };
  };

  const startBilling = Date.now();
  try {
    await geminiAgent.runGeminiResearch({ schemeName: 'Test' });
    console.error("❌ Test failed: Gemini research should have thrown an error immediately.");
  } catch (error) {
    const elapsed = Date.now() - startBilling;
    if (error.category === 'billing_required') {
      if (elapsed < 1000) {
         console.log("✅ Test passed: Gemini exited immediately without retrying on billing failure.");
      } else {
         console.error("❌ Test failed: Retries triggered unexpectedly. Elapsed: " + elapsed + "ms");
      }
    } else {
      console.error("❌ Test failed: Expected billing_required, got " + error.category);
    }
  }
  
  // Restore original
  originalClient.models.generateContent = originalGenerateContent;
}

runTests();
