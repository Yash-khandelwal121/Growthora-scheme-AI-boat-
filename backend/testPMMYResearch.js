require('dotenv').config();

const { performResearch } = require('./src/services/researchService');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');
const fs = require('fs');
const path = require('path');

const inputData = {
  schemeName: "Pradhan Mantri Mudra Yojana (PMMY)",
  primaryKeyword: "Mudra Loan Scheme 2026",
  secondaryKeywords: [
    "Mudra loan eligibility",
    "Mudra loan amount",
    "Mudra loan documents",
    "Mudra loan online apply"
  ],
  location: "India",
  language: "English"
};

async function runResearchTest() {
  try {
    const researchResult = await performResearch(inputData);
    
    const coverage = calculateCriticalFactCoverage(researchResult);
    
    console.log("==================================================");
    console.log("RESEARCH TEST RESULTS");
    console.log("==================================================");
    console.log(`Tavily Calls: ${researchResult.stats?.tavilyCalls || 0}`);
    console.log(`Groq Extraction Calls: ${researchResult.stats?.groqExtractionCalls || 0}`);
    console.log(`Official Sources Found: ${researchResult.stats?.officialSourcesFound || 0}`);
    console.log(`Pre-content CriticalFactCoverage: ${coverage.coveragePercent}%`);
    console.log(`Missing fields after gap-fill: ${coverage.nullCriticalFields.join(', ')}`);
    console.log(`Persisted research ID: ${researchResult.researchId}`);
    
    // Save to test output for inspection
    fs.writeFileSync(path.join(__dirname, 'pmmy-research-test-output.json'), JSON.stringify(researchResult, null, 2));
    
  } catch (error) {
    console.error("Research test failed:", error);
  }
}

runResearchTest();
