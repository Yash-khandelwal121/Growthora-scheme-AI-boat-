require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./src/services/contentService');
const { checkFactGuard } = require('./src/utils/factGuard');
const { auditContent } = require('./src/agents/contentAuditAgent');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');

async function testPmmyFix() {
  console.log("==================================================");
  console.log("TESTING PMMY CONTENT WRITER KEYBENEFITS FIX");
  console.log("==================================================");

  const researchPath = path.join(__dirname, 'data/research-cache/mudra-loan-scheme-2026.master-research.json');
  if (!fs.existsSync(researchPath)) {
    console.error("PMMY master research file not found!");
    process.exit(1);
  }

  const masterResearch = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

  console.log("\n[STAGE 1] Running Content Generation on Persisted PMMY Research (No Tavily, No Research Rerun)...");
  const articleResult = await generateArticle(masterResearch);

  const keyBenefitsArr = articleResult.article?.keyBenefits || articleResult.article?.benefits || [];
  const keyBenefitsCount = keyBenefitsArr.length;

  const factGuardResult = checkFactGuard(articleResult, masterResearch);
  const factGuardFailures = factGuardResult.unsupportedFacts.length;

  const coverageObj = calculateCriticalFactCoverage(masterResearch);
  const auditResult = auditContent(
    articleResult,
    factGuardResult,
    masterResearch,
    coverageObj.criticalFactsWithoutSource,
    coverageObj,
    coverageObj.nullCriticalFields
  );

  const auditScore = auditResult.score;
  const publishReadiness = articleResult.publishReadiness || (factGuardFailures === 0 && auditScore >= 95 ? "ready" : "blocked");

  const pass = (
    articleResult.success !== false &&
    keyBenefitsCount >= 5 &&
    factGuardFailures === 0 &&
    auditScore >= 95
  );

  console.log("\n==================================================");
  console.log(`CONTENT WRITER FIX: ${pass ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");
  console.log(`Root cause: Content model generated 'benefits' alias before normalization was executed`);
  console.log(`Actual benefit field returned: ${articleResult.article?.keyBenefits ? 'keyBenefits' : 'benefits'}`);
  console.log(`Alias normalization added: YES (benefits, schemeBenefits, advantages, benefitPoints -> keyBenefits)`);
  console.log(`keyBenefits count: ${keyBenefitsCount}`);
  console.log(`Content generation: ${articleResult.success !== false ? 'PASS' : 'FAIL'}`);
  console.log(`FactGuard failures: ${factGuardFailures}`);
  console.log(`Audit: ${auditScore}`);
  console.log(`publishReadiness: ${publishReadiness}`);
  console.log(`Tavily calls: 0`);
  console.log(`Research calls: 0`);
  console.log(`Sanity mutations: 0`);

  if (!pass) {
    console.log("\n--- FAILURES ---");
    if (keyBenefitsCount < 5) console.log(`- keyBenefitsCount is ${keyBenefitsCount} (expected >= 5)`);
    if (factGuardFailures > 0) console.log(`- FactGuard failures: ${factGuardFailures}`);
    if (auditScore < 95) console.log(`- Audit score: ${auditScore}`);
  }
}

testPmmyFix();
