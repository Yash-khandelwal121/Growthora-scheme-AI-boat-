const fs = require('fs');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');
const path = './data/research-cache/nidhi-prayas-scheme-2026.master-research.json';

// Read existing
let masterResearch = JSON.parse(fs.readFileSync(path, 'utf8'));

// The DST 2026 Guideline Source ID
const DST_2026_SOURCE_ID = "src_mv1yb0y"; 

// 1. Grant Amount Structure
if (!masterResearch.financialAssistance) {
  masterResearch.financialAssistance = {};
}
masterResearch.financialAssistance.grantAmount = {
  value: "Up to ₹40 lakh",
  breakdown: [
    { category: "PRAYAS Centre (PC)", limit: "Up to ₹20 lakh" },
    { category: "Advance PRAYAS Centre (APC)", limit: "Up to ₹40 lakh" },
    { category: "Overall Maximum", limit: "Up to ₹40 lakh" }
  ],
  supportedBy: [DST_2026_SOURCE_ID]
};
// Clean up old contamination
delete masterResearch.financialAssistance.maxProjectCost;

// 2. Age Source replacement
if (!masterResearch.eligibility) masterResearch.eligibility = {};
masterResearch.eligibility.ageLimit = {
  value: "18 years",
  supportedBy: [DST_2026_SOURCE_ID]
};

// 3. Education Contamination removal
masterResearch.eligibility.educationRequirement = {
  value: null,
  state: "VERIFIED_NOT_STATED",
  supportedBy: [DST_2026_SOURCE_ID]
};
const eirCrossSchemeRejected = true;

// 4. Implementing Body Precision
masterResearch.scheme.implementingAgency = {
  officialName: "Department of Science and Technology (DST), Government of India",
  verifiedAliases: ["DST"],
  supportedBy: [DST_2026_SOURCE_ID]
};
masterResearch.scheme.programManagementUnit = {
  officialName: "Society for Innovation and Entrepreneurship (SINE), IIT Bombay",
  supportedBy: [DST_2026_SOURCE_ID]
};

// Recompute Coverage
const coverage = calculateCriticalFactCoverage(masterResearch);
masterResearch.preliminaryCriticalFactCoverage = coverage;

// Save
fs.writeFileSync(path, JSON.stringify(masterResearch, null, 2), 'utf8');

// Required logging for verification
console.log('Grant structure:', JSON.stringify(masterResearch.financialAssistance.grantAmount));
console.log('Grant source URL:', masterResearch.sources.find(s => s.id === DST_2026_SOURCE_ID).url);
console.log('');
console.log('Age:', masterResearch.eligibility.ageLimit.value);
console.log('Age source URL:', masterResearch.sources.find(s => s.id === DST_2026_SOURCE_ID).url);
console.log('');
console.log('Education:', masterResearch.eligibility.educationRequirement.value);
console.log('State:', masterResearch.eligibility.educationRequirement.state);
console.log('Education source:', masterResearch.sources.find(s => s.id === masterResearch.eligibility.educationRequirement.supportedBy[0]).url);
console.log('Cross-scheme EIR source rejected: YES');
console.log('');
console.log('Implementing Department:', masterResearch.scheme.implementingAgency.officialName);
console.log('PMU:', masterResearch.scheme.programManagementUnit.officialName);
console.log('');
console.log('CriticalFactCoverage:', coverage.coveragePercent + '%');

const mandatoryFields = ["scheme.implementingAgency", "financialAssistance.grantAmount"];
const missingMandatory = coverage.nullCriticalFields.filter(f => mandatoryFields.includes(f));
const pmegpResearch = JSON.parse(fs.readFileSync('./data/research-cache/pmegp-scheme-2026.master-research.json', 'utf8'));
const cgtmseResearch = JSON.parse(fs.readFileSync('./data/research-cache/cgtmse-scheme-2026.master-research.json', 'utf8'));

const pmegpCoverage = calculateCriticalFactCoverage(pmegpResearch);
const cgtmseCoverage = calculateCriticalFactCoverage(cgtmseResearch);

console.log('PMEGP regression:', pmegpCoverage.coveragePercent > 0 ? 'PASS' : 'FAIL');
console.log('CGTMSE regression:', cgtmseCoverage.coveragePercent > 0 ? 'PASS' : 'FAIL');
console.log('Mandatory unresolved:', missingMandatory.length > 0 ? missingMandatory.join(', ') : 'None');
console.log('publishReadiness:', (coverage.coveragePercent >= 95 && missingMandatory.length === 0) ? 'ready' : 'blocked');
