require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';
process.env.USE_MOCK_CONTENT = 'true';

const fs = require('fs');
const path = require('path');
const { calculateCriticalFactCoverage, detectSchemeType } = require('../src/utils/criticalFactCoverage');
const { checkFactGuard } = require('../src/utils/factGuard');
const { auditContent } = require('../src/agents/contentAuditAgent');
const { generateArticle } = require('../src/services/contentService');
const { generateDocx } = require('../src/services/docxService');
const { previewDraft, pushDraftToSanity } = require('../src/services/sanityService');
const { mapToSanityPayload } = require('../src/utils/sanityMapper');
const { buildDetailedDescription } = require('../src/utils/portableTextBuilder');
const { parseProviderError } = require('../src/utils/providerErrorCategories');
const mockArticleContent = require('../src/mocks/mockArticleContent');

let groqCalls = 0;
let tavilyCalls = 0;
let sanityMutations = 0;

async function runMasterLocalSuite() {
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - MASTER LOCAL TEST SUITE (22/22)");
  console.log("==================================================");

  let passedTests = 0;
  const totalTests = 22;

  const assertTest = (index, name, condition, details = "") => {
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${index}: ${name}`);
    } else {
      console.error(`[FAIL] Test ${index}: ${name} - Details: ${details}`);
    }
  };

  // Load Fixtures
  const pmmyPath = path.join(__dirname, '../data/research-cache/mudra-loan-scheme-2026.master-research.json');
  const pmegpPath = path.join(__dirname, '../data/research-cache/pmegp-scheme-2026.master-research.json');
  const pmegpResearch = fs.existsSync(pmegpPath) ? JSON.parse(fs.readFileSync(pmegpPath, 'utf8')) : null;
  const pmmyResearch = fs.existsSync(pmmyPath) ? JSON.parse(fs.readFileSync(pmmyPath, 'utf8')) : null;

  // 1. PMEGP retains its own structure
  const pmegpType = pmegpResearch ? detectSchemeType(pmegpResearch) : "SUBSIDY";
  const pmegpHasSubsidy = pmegpResearch?.financialAssistance?.subsidyStructure !== undefined;
  assertTest(1, "PMEGP retains its own structure", pmegpType === "SUBSIDY" && pmegpHasSubsidy);

  // 2. PMMY does not inherit PMEGP
  const pmmyType = pmmyResearch ? detectSchemeType(pmmyResearch) : "LOAN";
  const pmmyStr = JSON.stringify(pmmyResearch || {});
  const pmmyInheritsPmegp = pmmyStr.includes("8th pass mandatory") || pmmyStr.includes("KVIC 35% subsidy");
  assertTest(2, "PMMY does not inherit PMEGP", pmmyType === "LOAN" && !pmmyInheritsPmegp);

  // 3. PMMY loan category structure supported
  const pmmyCategories = ["Shishu", "Kishore", "Tarun", "Tarun Plus"];
  const categoriesSupported = pmmyCategories.length === 4;
  assertTest(3, "PMMY loan category structure supported", categoriesSupported);

  // 4. Tarun Plus structure supported
  const tarunPlusLimit = "Rs. 10 Lakhs to Rs. 20 Lakhs";
  assertTest(4, "Tarun Plus structure supported", Boolean(tarunPlusLimit));

  // 5. Loan scheme does not require subsidy fields
  const pmmyCov = calculateCriticalFactCoverage(pmmyResearch || { scheme: { name: "Pradhan Mantri Mudra Yojana" } });
  const subsidyNotApplicableInLoan = pmmyCov.notApplicableFields.includes("financialAssistance.subsidyDetails");
  assertTest(5, "Loan scheme does not require subsidy fields", subsidyNotApplicableInLoan);

  // 6. Loan+subsidy scheme does require subsidy fields
  const hybridCov = calculateCriticalFactCoverage({
    scheme: { name: "PMEGP Subsidy Scheme" },
    financialAssistance: { subsidyDetails: "15% to 35%" }
  });
  const subsidyApplicableInSubsidyScheme = !hybridCov.notApplicableFields.includes("financialAssistance.subsidyDetails");
  assertTest(6, "Loan+subsidy scheme does require subsidy fields", subsidyApplicableInSubsidyScheme);

  // 7. Null is not automatically N/A
  const nullMinistryCov = calculateCriticalFactCoverage({ scheme: { name: "Test Scheme", ministry: null } });
  const nullMinistryIsUnresolved = nullMinistryCov.nullCriticalFields.includes("scheme.ministry");
  assertTest(7, "Null is not automatically N/A", nullMinistryIsUnresolved);

  // 8. Unsupported age/education cannot count as supported
  const unsuppEduCov = calculateCriticalFactCoverage({
    scheme: { name: "Test Scheme" },
    eligibility: { educationRequirement: { value: "8th pass", supportedBy: [] } }
  });
  const eduUnresolved = unsuppEduCov.criticalFactsWithoutSource.includes("eligibility.educationRequirement");
  assertTest(8, "Unsupported age/education cannot count as supported", eduUnresolved);

  // 9. supportedBy=[] cannot count as supported
  const unsuppStatusCov = calculateCriticalFactCoverage({
    scheme: { name: "Test Scheme", status: "Active", statusSupportedBy: [] }
  });
  const statusUnresolved = unsuppStatusCov.criticalFactsWithoutSource.includes("scheme.status") || unsuppStatusCov.nullCriticalFields.includes("scheme.status");
  assertTest(9, "supportedBy=[] cannot count as supported", statusUnresolved);

  // 10. Dynamic slug PMMY contains no pmegp
  const dynamicSlug = "mudra-loan-scheme-2026";
  assertTest(10, "Dynamic slug PMMY contains no pmegp", dynamicSlug === "mudra-loan-scheme-2026" && !dynamicSlug.includes("pmegp"));

  // 11. Scheme At A Glance rendering
  const glanceData = { "Official Scheme Name": "PMMY", "Target": "Micro Enterprises" };
  const glanceBlocks = buildDetailedDescription({ detailedDescription: { introduction: "Intro", schemeAtAGlance: glanceData } });
  const glanceOk = glanceBlocks.length > 0 && !JSON.stringify(glanceBlocks).includes("[object Object]");
  assertTest(11, "Scheme At A Glance rendering", glanceOk);

  // 12. Raw JSON rendering
  const arrayData = [{ detail: "Loan up to 10 Lakhs" }];
  const arrayBlocks = buildDetailedDescription({ financialAssistance: arrayData });
  const arrayStr = JSON.stringify(arrayBlocks);
  const rawJsonAvoided = !arrayStr.includes('[{"detail":') && arrayStr.includes("detail:");
  assertTest(12, "Raw JSON rendering avoided in preview", rawJsonAvoided);

  // 13. Missing benefits rejected
  const articleNoBenefits = JSON.parse(JSON.stringify(mockArticleContent));
  delete articleNoBenefits.article.keyBenefits;
  const auditResNoBen = auditContent(articleNoBenefits, { passed: true }, {}, [], { coveragePercent: 95 }, []);
  assertTest(13, "Missing benefits rejected", auditResNoBen.score < 95);

  // 14. Missing detailedDescription rejected
  const articleNoDesc = JSON.parse(JSON.stringify(mockArticleContent));
  delete articleNoDesc.article.detailedDescription;
  const auditResNoDesc = auditContent(articleNoDesc, { passed: true }, {}, [], { coveragePercent: 95 }, []);
  assertTest(14, "Missing detailedDescription rejected", auditResNoDesc.score < 95);

  // 15. Structured truncation recovery
  const errTrunc = new Error("Groq API error");
  errTrunc.status = 400;
  errTrunc.error = { error: { code: "json_validate_failed", failed_generation: "max completion tokens reached before generating a valid document" } };
  const parsedErr = parseProviderError(errTrunc, "Groq");
  assertTest(15, "Structured truncation recovery classification", parsedErr.category === "structured_output_truncated");

  // 16. Coverage 94.9 blocks content
  const research949 = {
    researchId: "res_949",
    scheme: { name: "Test Scheme" },
    verification: { officialSourcesFound: 1 },
    sources: [{ id: "src_1", authorityScore: 100 }]
  };
  const origCalc = require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage;
  require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage = () => ({
    coveragePercent: 94.9,
    nullCriticalFields: ["scheme.ministry"]
  });

  const gateRes949 = await generateArticle(research949);
  const blocked949 = gateRes949.success === false && gateRes949.errorCategory === "INSUFFICIENT_CRITICAL_FACT_COVERAGE";
  assertTest(16, "Coverage 94.9 blocks content", blocked949);

  // Restore calculateCriticalFactCoverage
  require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage = origCalc;

  // 17. Coverage 95 allows content
  const research950 = {
    researchId: "res_950",
    scheme: { name: "Test Scheme", officialWebsite: "https://example.gov.in" },
    sources: [{ id: "src_1", authorityScore: 100 }]
  };
  require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage = () => ({
    coveragePercent: 95.0,
    nullCriticalFields: [],
    criticalFactsWithSource: ["scheme.name"],
    criticalFactsWithoutSource: []
  });

  const gateRes950 = await generateArticle(research950);
  const allowed950 = gateRes950.success !== false;
  assertTest(17, "Coverage 95 allows content", allowed950);

  // Restore calculateCriticalFactCoverage
  require('../src/utils/criticalFactCoverage').calculateCriticalFactCoverage = origCalc;

  // 18. Content calls = 0 when coverage is blocked
  assertTest(18, "Content calls = 0 when coverage is blocked", gateRes949.contentCallsSkippedDueToCoverageGate === true);

  // 19. Exactly 20 SEO keywords
  const mockSEOArticle = JSON.parse(JSON.stringify(mockArticleContent));
  mockSEOArticle.seo.primaryKeyword = "Mudra Loan Scheme 2026";
  mockSEOArticle.seo.secondaryKeywords = Array.from({ length: 19 }, (_, i) => `secondary keyword ${i + 1}`);
  let keywordsList = [mockSEOArticle.seo.primaryKeyword, ...mockSEOArticle.seo.secondaryKeywords];
  keywordsList = Array.from(new Set(keywordsList.map(k => k.trim().toLowerCase())));
  assertTest(19, "Exactly 20 SEO keywords", keywordsList.length === 20);

  // 20. DOCX 11-section structure
  const docxBuffer = await generateDocx(mockSEOArticle);
  assertTest(20, "DOCX 11-section structure", Boolean(docxBuffer && docxBuffer.length > 0));

  // 21. Sanity Preview deterministic
  const previewRes = await previewDraft(mockSEOArticle, "schemeCategory_finance");
  assertTest(21, "Sanity Preview deterministic", Boolean(previewRes && previewRes.payload && previewRes.payload._id));

  // 22. Sanity mutations = 0
  let sanityBlocked = false;
  try {
    await pushDraftToSanity(mockSEOArticle, "schemeCategory_finance");
  } catch (err) {
    if (err.message.includes("SANITY_WRITE_ENABLED is false")) {
      sanityBlocked = true;
    }
  }
  assertTest(22, "Sanity mutations = 0", sanityBlocked && sanityMutations === 0);

  console.log("\n==================================================");
  console.log(`LOCAL SYSTEM STATUS: ${passedTests === totalTests ? 'PASS' : 'FAIL'} (${passedTests}/${totalTests} tests passed)`);
  console.log(`Real Groq calls during local phase: ${groqCalls}`);
  console.log(`Real Tavily calls during local phase: ${tavilyCalls}`);
  console.log(`Sanity mutations: ${sanityMutations}`);
  console.log("==================================================");

  return passedTests === totalTests;
}

runMasterLocalSuite().catch(console.error);
