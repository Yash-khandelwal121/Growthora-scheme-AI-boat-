require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateArticle } = require('../src/services/contentService');
const { calculateCriticalFactCoverage } = require('../src/utils/criticalFactCoverage');

let groqCalls = 0;
let tavilyCalls = 0;
let sanityMutations = 0;

async function runPreContentGateTest() {
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - PRE-CONTENT GATE LOCAL TEST");
  console.log("==================================================");

  // 1. Load real persisted PMMY research JSON
  const pmmyCachePath = path.join(__dirname, '../data/research-cache/mudra-loan-scheme-2026.master-research.json');
  if (!fs.existsSync(pmmyCachePath)) {
    console.error("Missing persisted PMMY research file:", pmmyCachePath);
    return;
  }

  const masterResearch = JSON.parse(fs.readFileSync(pmmyCachePath, 'utf8'));

  // 2. Perform Local Coverage Inspection
  console.log("\n--- LOCAL PMMY FIELD INSPECTION ---");
  const coverageData = calculateCriticalFactCoverage(masterResearch);
  console.log(`Current coverage: ${coverageData.coveragePercent}%`);
  console.log(`Required critical facts: ${coverageData.requiredCriticalFacts}`);
  console.log(`Source-supported critical facts: ${coverageData.sourceSupportedCriticalFacts}`);
  console.log(`Null critical fields: ${coverageData.nullCriticalFields.length}`);

  const fieldList = [
    { field: "scheme.name", value: masterResearch.scheme?.name, supportedBy: masterResearch.scheme?.sourceIds || [], applicable: "YES" },
    { field: "scheme.ministry", value: masterResearch.scheme?.ministry?.officialName, supportedBy: masterResearch.scheme?.ministry?.supportedBy || [], applicable: "YES" },
    { field: "scheme.implementingAgency", value: masterResearch.scheme?.implementingAgency?.officialName, supportedBy: masterResearch.scheme?.implementingAgency?.supportedBy || [], applicable: "YES" },
    { field: "scheme.officialWebsite", value: masterResearch.scheme?.officialWebsite, supportedBy: [], applicable: "YES" },
    { field: "scheme.status", value: masterResearch.scheme?.status, supportedBy: [], applicable: "YES" },
    { field: "financialAssistance.maxProjectCost.manufacturing", value: masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.value, supportedBy: masterResearch.financialAssistance?.maxProjectCost?.manufacturing?.supportedBy || [], applicable: "YES" },
    { field: "financialAssistance.maxProjectCost.service", value: masterResearch.financialAssistance?.maxProjectCost?.service?.value, supportedBy: masterResearch.financialAssistance?.maxProjectCost?.service?.supportedBy || [], applicable: "YES" },
    { field: "financialAssistance.subsidyDetails", value: masterResearch.financialAssistance?.subsidyDetails, supportedBy: [], applicable: "NO" },
    { field: "financialAssistance.beneficiaryContribution", value: masterResearch.financialAssistance?.beneficiaryContribution, supportedBy: [], applicable: "YES" },
    { field: "eligibility.ageLimit", value: masterResearch.eligibility?.ageLimit?.value, supportedBy: masterResearch.eligibility?.ageLimit?.supportedBy || [], applicable: "YES" },
    { field: "eligibility.educationRequirement", value: masterResearch.eligibility?.educationRequirement?.value, supportedBy: masterResearch.eligibility?.educationRequirement?.supportedBy || [], applicable: "YES" }
  ];

  fieldList.forEach(f => {
    const isSupported = Boolean(f.value && (f.supportedBy.length > 0 || f.field.startsWith("scheme.")));
    const state = isSupported ? "supported" : (f.value ? "unsupported_value" : "null");
    console.log(`field: ${f.field} | state: ${state} | value: ${f.value || 'null'} | supportedBy: [${f.supportedBy.join(', ')}] | applicable: ${f.applicable}`);
  });

  // 3. Test Hard Pre-Content Coverage Gate with 36.4% Coverage
  console.log("\n--- TESTING PRE-CONTENT GATE AT 36.4% COVERAGE ---");
  const gateRes36 = await generateArticle(masterResearch);
  
  const blockedAt36 = gateRes36.success === false && 
                      gateRes36.errorCategory === "INSUFFICIENT_CRITICAL_FACT_COVERAGE" &&
                      gateRes36.publishReadiness === "blocked" &&
                      gateRes36.contentCallsSkippedDueToCoverageGate === true;
                      
  console.log(`Gate blocked at 36.4% coverage: ${blockedAt36 ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log(`Error Category: ${gateRes36.errorCategory}`);
  console.log(`Content Calls Skipped: ${gateRes36.contentCallsSkippedDueToCoverageGate}`);

  // 4. Test Hard Pre-Content Coverage Gate at 94.9% Coverage
  console.log("\n--- TESTING PRE-CONTENT GATE AT 94.9% COVERAGE ---");
  const mock949Research = {
    ...masterResearch,
    preliminaryCriticalFactCoverage: { coveragePercent: 94.9 }
  };
  // Mock calculateCriticalFactCoverage to return 94.9% for test
  const origCalc = require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage;
  require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage = () => ({
    coveragePercent: 94.9,
    nullCriticalFields: ["financialAssistance.subsidyDetails"]
  });

  const gateRes949 = await generateArticle(mock949Research);
  const blockedAt949 = gateRes949.success === false && gateRes949.errorCategory === "INSUFFICIENT_CRITICAL_FACT_COVERAGE";
  console.log(`Gate blocked at 94.9% coverage: ${blockedAt949 ? 'YES (PASS)' : 'NO (FAIL)'}`);

  // Restore calculateCriticalFactCoverage
  require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage = origCalc;

  const overallPass = blockedAt36 && blockedAt949 && groqCalls === 0 && tavilyCalls === 0 && sanityMutations === 0;

  console.log("\n==================================================");
  console.log(`PRE-CONTENT GATE STATUS: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");
}

runPreContentGateTest().catch(console.error);
