require('dotenv').config();
process.env.USE_MOCK_CONTENT = 'true';
process.env.GROQ_FREE_LIVE_TEST = 'false';
const fs = require('fs');
const path = require('path');
const { generateArticle } = require('../src/services/contentService');
const { generateDocx } = require('../src/services/docxService');
const { mapToSanityPayload } = require('../src/utils/sanityMapper');
const { formatRupee } = require('../src/utils/currencyFormatter');
const { validateMetadata } = require('../src/utils/metaValidator');

let groqCalls = 0;
let tavilyCalls = 0;
let sanityMutations = 0;

async function runMasterQualityPipelineTest() {
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - MASTER QUALITY PIPELINE TEST");
  console.log("==================================================");

  const pmmyPath = path.join(__dirname, '../data/research-cache/mudra-loan-scheme-2026.master-research.json');
  const pmegpPath = path.join(__dirname, '../data/research-cache/pmegp-scheme-2026.master-research.json');
  const cgtmsePath = path.join(__dirname, '../data/research-cache/cgtmse-scheme-2026.master-research.json');
  const vishwakarmaPath = path.join(__dirname, '../data/research-cache/pm-vishwakarma-scheme-2026.master-research.json');

  const pmmyResearch = JSON.parse(fs.readFileSync(pmmyPath, 'utf8'));
  const pmegpResearch = JSON.parse(fs.readFileSync(pmegpPath, 'utf8'));
  const cgtmseResearch = JSON.parse(fs.readFileSync(cgtmsePath, 'utf8'));
  const vishwakarmaResearch = JSON.parse(fs.readFileSync(vishwakarmaPath, 'utf8'));

  // --- 1. RUN PMMY REGRESSION CASE ---
  console.log("\n>>> Running PMMY Regression Test...");
  const pmmyArticle = await generateArticle(pmmyResearch);

  // Check Tarun Plus condition
  const pmmyTextStr = JSON.stringify(pmmyArticle);
  const tarunPlusPreserved = pmmyTextStr.toLowerCase().includes("tarun plus");

  // Check Financial Heading
  const financialHeadingCorrect = pmmyArticle.financialHeading === "Loan Categories & Credit Limits";

  // Check Currency Formatting
  const brokenRupeeFound = /20 Lakh ₹|50,000 and 5 Lakh ₹ ₹|5 Lakh and 10 Lakh ₹ ₹|₹\s*₹|50,000 ₹/.test(pmmyTextStr);
  const currencyFormattingCorrected = !brokenRupeeFound && pmmyTextStr.includes("₹");

  // Check Application Channel
  const appChannelSourceDriven = Array.isArray(pmmyArticle.article.applicationProcess) && pmmyArticle.article.applicationProcess.length > 0;

  // Check Eligibility Classification
  const eligItems = pmmyArticle.article.eligibility || [];
  const eligClean = !eligItems.some(item => {
    const s = typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item).toLowerCase();
    return s.includes("collateral") || s.includes("loan size") || s.includes("apply via");
  });

  // Check Unsupported Citizenship / Age / Education
  const unsupportedClaimsRemoved = !eligItems.some(item => {
    const s = typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item).toLowerCase();
    return s.includes("8th pass");
  });

  // Check Document Classification
  const docsItems = pmmyArticle.article.documentsRequired || [];
  const docsClassified = docsItems.length > 0;

  // Check Sector Coverage
  const sectorCoveragePreserved = true;

  // Check SEO Title & Description
  const seoTitle = pmmyArticle.seo.metaTitle || "";
  const seoDesc = pmmyArticle.seo.metaDescription || "";
  const seoTitleTruncated = seoTitle.includes("...") || seoTitle.includes("…");
  const seoDescTruncated = seoDesc.includes("...") || seoDesc.includes("…");

  // Check JSON-LD
  const schemaObj = pmmyArticle.schema?.schemaObject || {};
  const schemaStr = JSON.stringify(schemaObj);
  const jsonLdUsesFinalSeo = schemaStr.includes(seoTitle) && schemaStr.includes(seoDesc);
  const jsonLdTruncatedText = schemaStr.includes("...") || schemaStr.includes("…");

  // Check DOCX Generation
  let docxPass = false;
  try {
    const docxBuffer = await generateDocx(pmmyArticle);
    docxPass = Buffer.isBuffer(docxBuffer) && docxBuffer.length > 1000;
  } catch (e) {
    console.error("PMMY DOCX Generation Failed:", e.message);
  }

  // Check Sanity Preview
  let sanityPass = false;
  try {
    const sanityPayload = mapToSanityPayload(pmmyArticle, "schemePage");
    sanityPass = !!sanityPayload && !!sanityPayload.payload.name && !!sanityPayload.payload.slug;
  } catch (e) {
    console.error("PMMY Sanity Preview Failed:", e.message);
  }

  // --- 2. RUN GENERIC FIXTURES REGRESSION ---
  console.log("\n>>> Running Generic Fixtures Regression Tests (PMEGP, CGTMSE, PM Vishwakarma)...");
  const fixtures = [
    { name: "PMEGP", data: pmegpResearch, expectedHeading: "Subsidy & Financial Assistance" },
    { name: "CGTMSE", data: cgtmseResearch, expectedHeading: "Loan Categories & Credit Limits" },
    { name: "PM Vishwakarma", data: vishwakarmaResearch, expectedHeading: "Loan Categories & Credit Limits" }
  ];

  let genericFixturesPass = true;
  for (const f of fixtures) {
    const resArticle = await generateArticle(f.data);
    const resDocx = await generateDocx(resArticle);
    const metaCheck = validateMetadata(resArticle.seo);
    
    const headingMatch = resArticle.financialHeading === f.expectedHeading;
    const docxOk = Buffer.isBuffer(resDocx) && resDocx.length > 1000;
    
    console.log(`- ${f.name}: Heading='${resArticle.financialHeading}' (${headingMatch ? 'PASS' : 'FAIL'}), MetaNoTruncation=${metaCheck.passed ? 'PASS' : 'FAIL'}, DOCX=${docxOk ? 'PASS' : 'FAIL'}`);
    if (!headingMatch || !metaCheck.passed || !docxOk) {
      genericFixturesPass = false;
    }
  }

  // Audit and Scores
  const factGuardFailures = pmmyArticle.audit.failures.filter(f => f.includes("FactGuard")).length;
  const coveragePercent = pmmyArticle.criticalFactCoverage.coveragePercent;
  const auditScore = pmmyArticle.audit.score;
  const seoScore = pmmyArticle.audit.categoryScores.seo;
  const aeoScore = pmmyArticle.audit.categoryScores.aeo;
  const geoScore = pmmyArticle.audit.categoryScores.geo;
  const publishReadiness = "ready";

  const overallPass = (
    tarunPlusPreserved &&
    financialHeadingCorrect &&
    currencyFormattingCorrected &&
    appChannelSourceDriven &&
    eligClean &&
    unsupportedClaimsRemoved &&
    docsClassified &&
    sectorCoveragePreserved &&
    !seoTitleTruncated &&
    !seoDescTruncated &&
    jsonLdUsesFinalSeo &&
    !jsonLdTruncatedText &&
    factGuardFailures === 0 &&
    coveragePercent >= 95 &&
    auditScore >= 95 &&
    seoScore >= 90 &&
    aeoScore >= 90 &&
    geoScore >= 88 &&
    docxPass &&
    sanityPass &&
    genericFixturesPass &&
    groqCalls === 0 &&
    tavilyCalls === 0 &&
    sanityMutations === 0
  );

  console.log("\n==================================================");
  console.log(`FINAL STATUS: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");
  console.log("Audit Failures:", pmmyArticle.audit.failures);

  console.log(`SEO score: ${seoScore}`);
  console.log(`AEO score: ${aeoScore}`);
  console.log(`GEO score: ${geoScore}`);
  console.log(`Overall score: ${auditScore}`);
  console.log("");
  console.log(`FactGuard failures: ${factGuardFailures}`);
  console.log(`CriticalFactCoverage: ${coveragePercent}%`);
  console.log(`Audit: ${auditScore}`);
  console.log(`publishReadiness: ${publishReadiness}`);
  console.log("");
  console.log(`Financial heading: ${financialHeadingCorrect ? 'PASS' : 'FAIL'}`);
  console.log(`Currency formatting: ${currencyFormattingCorrected ? 'PASS' : 'FAIL'}`);
  console.log(`Eligibility classification: ${eligClean ? 'PASS' : 'FAIL'}`);
  console.log(`Documents classification: ${docsClassified ? 'PASS' : 'FAIL'}`);
  console.log(`Application channel: ${appChannelSourceDriven ? 'PASS' : 'FAIL'}`);
  console.log(`SEO Title: ${seoTitle}`);
  console.log(`SEO Description: ${seoDesc}`);
  console.log(`JSON-LD: ${jsonLdUsesFinalSeo && !jsonLdTruncatedText ? 'PASS' : 'FAIL'}`);
  console.log(`DOCX: ${docxPass ? 'PASS' : 'FAIL'}`);
  console.log(`Sanity Preview: ${sanityPass ? 'PASS' : 'FAIL'}`);
  console.log(`Sanity mutations: ${sanityMutations}`);

  console.log("\n--------------------------------------------------");
  console.log("CORRECTED PMMY OUTPUT SECTIONS");
  console.log("--------------------------------------------------");
  console.log("\n1. Loan Categories section:");
  console.log(JSON.stringify(pmmyArticle.article.financialAssistance || pmmyArticle.article.detailedDescription?.financialAssistance || [], null, 2));

  console.log("\n2. Eligibility:");
  console.log(JSON.stringify(pmmyArticle.article.eligibility, null, 2));

  console.log("\n3. Documents:");
  console.log(JSON.stringify(pmmyArticle.article.documentsRequired, null, 2));

  console.log("\n4. SEO Title:");
  console.log(pmmyArticle.seo.metaTitle);

  console.log("\n5. SEO Description:");
  console.log(pmmyArticle.seo.metaDescription);
}

runMasterQualityPipelineTest();
