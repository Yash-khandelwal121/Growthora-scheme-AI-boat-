require('dotenv').config({ path: '.env' });
process.env.USE_MOCK_RESEARCH = "true";

const { performResearch } = require('../src/services/researchService');

async function runTests() {
  console.log("Testing Mock End-to-End...");
  
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
    
    let passCount = 0;
    
    // Test A: Authoritative evidence wins
    if (result.financialAssistance.maxProjectCost === "₹50 lakh for manufacturing, ₹20 lakh for service sector") {
      console.log("✅ TEST A PASSED: Authoritative evidence overrides provider majority");
      passCount++;
    } else {
      console.error("❌ TEST A FAILED: Expected authoritative evidence to win");
    }

    // Test B: No authoritative deadline
    if (result.importantDates.applicationDeadline === null) {
      console.log("✅ TEST B PASSED: Unsupported deadline remains null");
      passCount++;
    } else {
      console.error("❌ TEST B FAILED: Application deadline should be null");
    }

    // Test C: Official scheme name does not include 2026
    if (result.scheme.name === "Prime Minister's Employment Generation Programme") {
      console.log("✅ TEST C PASSED: Official scheme name separated from SEO keyword year");
      passCount++;
    } else {
      console.error("❌ TEST C FAILED: Scheme name incorrectly includes 2026");
    }

    // Test D: Deduplication of sources
    if (result.sources.length === 4) {
      console.log("✅ TEST D PASSED: Duplicate official URLs removed (expected 4, got " + result.sources.length + ")");
      passCount++;
    } else {
      console.error("❌ TEST D FAILED: Deduplication failed, expected 4 got " + result.sources.length + " sources");
    }

    // Test E: Weak evidence -> needs human review
    if (result.verification.needsHumanReview.some(msg => msg.includes("some.unresolved.fact"))) {
      console.log("✅ TEST E PASSED: Weak evidence triggers Needs Human Review");
      passCount++;
    } else {
      console.error("❌ TEST E FAILED: Missing human review for weak evidence");
    }

    // Test F: Program outlay exists
    if (result.scheme.programOutlay && result.scheme.programOutlay.includes("Crore")) {
      console.log("✅ TEST F PASSED: Program outlay exists and is preserved");
      passCount++;
    } else {
      console.error("❌ TEST F FAILED: Program outlay missing");
    }

    // Test G: Subsidy and loan are separate fields
    if (result.financialAssistance.subsidyDetails && result.financialAssistance.loanDetails) {
      console.log("✅ TEST G PASSED: Subsidy and loan are separate fields");
      passCount++;
    } else {
      console.error("❌ TEST G FAILED: Subsidy and loan merged");
    }
    
    console.log(`\nMock End-to-End Test finished. Passed ${passCount}/7 tests.`);
    
    console.log("Master JSON Keys:", Object.keys(result));
    
  } catch (err) {
    console.error("Error running Mock E2E:", err);
  }
}

runTests();
