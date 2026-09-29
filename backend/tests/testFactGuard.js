const { checkFactGuard, extractStrings } = require('../src/utils/factGuard');

async function runFactGuardTests() {
  const researchJson = {
    scheme: {
      officialWebsite: "https://example.gov.in/official",
      applicationWebsite: "https://example.gov.in/apply",
      ministry: "Ministry of Micro, Small and Medium Enterprises"
    },
    sources: [
      { url: "https://example.gov.in/source" }
    ],
    numbers: ["15", "50", "20", "2026", "35%", "15%", "10%"] // mock for gatherResearchEntities
  };
  
  // Actually, gatherResearchEntities reads from all strings, so let's put these numbers somewhere
  researchJson.fakeField = "Here are numbers: 50, 20, 2026. Percentages: 35%, 15%, 10%.";
  
  const articleData = {
    article: {
      text1: "Check out https://example.gov.in/official.",
      text2: "Check out https://example.gov.in/apply,",
      nested: { url: "https://example.gov.in/source" },
      faq: [
        { answer: "Go to https://example.gov.in/official." }
      ],
      ministryExact: "This is by the Ministry of Micro, Small and Medium Enterprises and others.",
      ministryGreedy: "This is by the Ministry of Micro, Small and Medium Enterprises to generate self.",
      // Some formatting numbers that are ignored like 15
      numbers: "15, 1, 2, 3", 
      validNum: "2026"
    }
  };

  const res1 = checkFactGuard(articleData, researchJson);
  console.log("Test 1-7 (Valid cases):", res1.passed ? "PASSED" : "FAILED", res1.unsupportedFacts);

  // Test failure cases
  const badArticleData = {
    article: {
      fakeUrl: "https://example.com/fake",
      inventedMinistry: "Ministry of Fake Stuff",
      hallucinatedNum: "999999",
      hallucinatedPct: "82%",
      hallucinatedDate: "2029"
    }
  };

  const res2 = checkFactGuard(badArticleData, researchJson);
  const facts = res2.unsupportedFacts;
  
  const fakeUrlRejected = facts.some(f => f.includes("https://example.com/fake"));
  const fakeMinistryRejected = facts.some(f => f.includes("Ministry of Fake Stuff"));
  const fakeNumRejected = facts.some(f => f.includes("999999"));
  const fakePctRejected = facts.some(f => f.includes("82%"));
  const fakeDateRejected = facts.some(f => f.includes("2029"));

  console.log("Test 8 (Fake URL rejected):", fakeUrlRejected ? "PASSED" : "FAILED");
  console.log("Test 9 (Fake Ministry rejected):", fakeMinistryRejected ? "PASSED" : "FAILED");
  console.log("Test 10 (Hallucinated Num rejected):", fakeNumRejected ? "PASSED" : "FAILED");
  console.log("Test 11 (Hallucinated Pct rejected):", fakePctRejected ? "PASSED" : "FAILED");
  console.log("Test 12 (Hallucinated Date rejected):", fakeDateRejected ? "PASSED" : "FAILED");
  
  if (res1.passed && fakeUrlRejected && fakeMinistryRejected && fakeNumRejected && fakePctRejected && fakeDateRejected) {
    console.log("ALL FACT GUARD TESTS PASSED");
  } else {
    console.error("SOME FACT GUARD TESTS FAILED");
    process.exit(1);
  }
}

runFactGuardTests();
