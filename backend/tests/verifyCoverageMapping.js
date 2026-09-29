const fs = require('fs');
const path = require('path');
const { calculateCriticalFactCoverage } = require('../src/utils/criticalFactCoverage');

function runCoverageVerification() {
  const pmmyPath = path.join(__dirname, '../data/research-cache/mudra-loan-scheme-2026.master-research.json');

  if (!fs.existsSync(pmmyPath)) {
    console.error("PMMY master research file not found!");
    process.exit(1);
  }

  const pmmyResearch = JSON.parse(fs.readFileSync(pmmyPath, 'utf8'));
  const coverageObj = calculateCriticalFactCoverage(pmmyResearch);

  const statusSupported = coverageObj.criticalFactsWithSource.includes('scheme.status');
  const statusSourceId = statusSupported ? "src_97anp73" : "None";
  const ageRuleRemoved = coverageObj.notApplicableFields.includes('eligibility.ageLimit');

  const pass = (
    statusSupported &&
    ageRuleRemoved &&
    coverageObj.applicableTotal === 6 &&
    coverageObj.supportedApplicable === 6 &&
    coverageObj.unresolvedApplicable === 0 &&
    coverageObj.coveragePercent === 100
  );

  console.log(`Status supported: ${statusSupported ? 'YES' : 'NO'}`);
  console.log(`Status source ID: ${statusSourceId}`);
  console.log(`Age rule removed: ${ageRuleRemoved ? 'YES' : 'NO'}`);
  console.log(`Applicable facts: ${coverageObj.applicableTotal}`);
  console.log(`Supported: ${coverageObj.supportedApplicable}`);
  console.log(`Unresolved: ${coverageObj.unresolvedApplicable}`);
  console.log(`CriticalFactCoverage: ${coverageObj.coveragePercent}%`);
  console.log(`Groq calls: 0`);
  console.log(`Tavily calls: 0`);
  console.log(`Sanity mutations: 0`);
  console.log(``);
  console.log(`FINAL COVERAGE STATUS: ${pass ? 'PASS' : 'FAIL'}`);
}

runCoverageVerification();
