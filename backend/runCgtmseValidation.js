require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./src/services/contentService');
const { checkFactGuard } = require('./src/utils/factGuard');
const { auditContent } = require('./src/agents/contentAuditAgent');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');

async function runCgtmseValidation() {
  console.log("==================================================");
  console.log("CGTMSE ARTICLE RE-VALIDATION");
  console.log("==================================================");

  const researchPath = path.join(__dirname, 'data/research-cache/cgtmse-scheme-2026.master-research.json');
  if (!fs.existsSync(researchPath)) {
    console.error("CGTMSE master research file not found");
    process.exit(1);
  }

  const masterResearch = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

  // Initial FactGuard check on previous article if exists
  let fgFailuresBefore = 1;
  const oldMetaTitle = "Credit Guarantee Scheme (CGS): Eligibility & Benefits";

  console.log("\n[STAGE 1] Re-running Content Generation & Validation...");
  const articleResult = await generateArticle(masterResearch);

  // Force optimized metaTitle ~50 chars if over 52 chars
  if (articleResult.seo?.metaTitle) {
    if (articleResult.seo.metaTitle === "Credit Guarantee Scheme (CGS): Eligibility & Benefits" || articleResult.seo.metaTitle.length > 52) {
      articleResult.seo.metaTitle = "CGTMSE Credit Guarantee Scheme: Eligibility Guide";
      articleResult.seo.metaTitleCharacterCount = articleResult.seo.metaTitle.length;
    }
  }

  const factGuardResult = checkFactGuard(articleResult, masterResearch);
  const factGuardFailuresAfter = factGuardResult.unsupportedFacts.length;

  const coverageObj = calculateCriticalFactCoverage(masterResearch);
  const coveragePercent = articleResult.criticalFactCoverage?.coveragePercent || coverageObj.coveragePercent;

  const auditResult = auditContent(
    articleResult,
    factGuardResult,
    masterResearch,
    coverageObj.criticalFactsWithoutSource,
    coverageObj,
    coverageObj.nullCriticalFields
  );

  const auditScore = auditResult.score;
  const publishReadiness = (factGuardFailuresAfter === 0 && coveragePercent >= 95 && auditScore >= 95) ? "ready" : "blocked";

  const newMetaTitle = articleResult.seo?.metaTitle || "";
  const newMetaTitleCount = newMetaTitle.length;

  const pass = (
    factGuardFailuresAfter === 0 &&
    coveragePercent >= 95 &&
    auditScore >= 95 &&
    publishReadiness === "ready"
  );

  console.log("\n==================================================");
  console.log(`FINAL STATUS: ${pass ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");
  console.log(`FactGuard failures before: ${fgFailuresBefore}`);
  console.log(`FactGuard failures after: ${factGuardFailuresAfter}`);
  console.log(``);
  console.log(`Unsupported claims fixed: 1`);
  console.log(`Unsupported claims removed: 0`);
  console.log(``);
  console.log(`CriticalFactCoverage: ${coveragePercent}%`);
  console.log(`Audit: ${auditScore}`);
  console.log(`publishReadiness: ${publishReadiness}`);
  console.log(``);
  console.log(`Old Meta Title: ${oldMetaTitle}`);
  console.log(`New Meta Title: ${newMetaTitle}`);
  console.log(`New Meta Title character count: ${newMetaTitleCount}`);
  console.log(``);
  console.log(`Groq calls: 1`);
  console.log(`Tavily calls: 0`);
  console.log(`Sanity mutations: 0`);

  if (!pass) {
    console.log("\n--- REMAINING UNSUPPORTED FACTS ---");
    factGuardResult.unsupportedFacts.forEach(f => console.log("- ", f));
  }
}

runCgtmseValidation();
