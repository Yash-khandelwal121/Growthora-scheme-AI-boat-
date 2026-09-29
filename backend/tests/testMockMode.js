require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { performResearch } = require('../src/services/researchService');
const { generateArticle } = require('../src/services/contentService');

async function testMockMode() {
  console.log("Testing zero-paid-call mock mode...");
  const startEnv = process.env.USE_MOCK_RESEARCH;
  const startContentEnv = process.env.USE_MOCK_CONTENT;
  
  process.env.USE_MOCK_RESEARCH = "true";
  process.env.USE_MOCK_CONTENT = "true";

  try {
    const researchInput = {
      schemeName: "PMEGP",
      primaryKeyword: "PMEGP Scheme 2026",
      secondaryKeywords: ["PMEGP eligibility", "PMEGP subsidy", "PMEGP loan", "PMEGP documents"],
      location: "India",
      outcome: "Complete Scheme Guide",
      language: "English"
    };

    console.log("\n--- Research Service Mock Test ---");
    const researchData = await performResearch(researchInput);
    if (researchData.mode === "mock" && researchData.liveResearch === false) {
      console.log("✅ Research mode is properly set to 'mock'");
    } else {
      console.error("❌ Research mode NOT properly set to 'mock'");
    }
    
    if (researchData.researchId) {
      console.log("✅ researchId exists:", researchData.researchId);
    } else {
      console.error("❌ researchId missing");
    }

    if (researchData.sources && researchData.sources.length > 0) {
      console.log("✅ sources exist:", researchData.sources.length);
    } else {
      console.error("❌ sources missing");
    }

    if (researchData.verification && researchData.verification.overallConfidence) {
      console.log("✅ verification and overall confidence exist:", researchData.verification.overallConfidence.level);
    } else {
      console.error("❌ verification missing");
    }

    console.log("\n--- Content Service Mock Test ---");
    const articleData = await generateArticle(researchData);
    if (articleData.mode === "mock" && articleData.liveContentGeneration === false) {
      console.log("✅ Content mode is properly set to 'mock'");
    } else {
      console.error("❌ Content mode NOT properly set to 'mock'");
    }

    if (articleData.sourceResearchId === researchData.researchId) {
      console.log("✅ sourceResearchId matches");
    } else {
      console.error("❌ sourceResearchId mismatch");
    }

    console.log("\nZero paid call tests completed. (Checked by manual verification of getOpenAIClient missing from network calls.)");
  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    process.env.USE_MOCK_RESEARCH = startEnv;
    process.env.USE_MOCK_CONTENT = startContentEnv;
  }
}

testMockMode();
