require('dotenv').config({ path: '.env' });
const { performResearch } = require('../src/services/researchService');

async function runEndToEnd() {
  console.log("Starting end-to-end research test for PMEGP...");
  
  const input = {
    schemeName: "PMEGP",
    primaryKeyword: "PMEGP Scheme 2026",
    secondaryKeywords: [
      "PMEGP eligibility",
      "PMEGP subsidy",
      "PMEGP loan",
      "PMEGP documents"
    ],
    location: "India",
    outcome: "Complete Scheme Guide",
    language: "English"
  };

  try {
    const result = await performResearch(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("End-to-End Test Failed:");
    console.error(error.message);
  }
}

runEndToEnd();
