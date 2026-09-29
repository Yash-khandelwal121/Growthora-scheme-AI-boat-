require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./src/services/contentService');
const { generateDocx } = require('./src/services/docxService');
const { previewDraft } = require('./src/services/sanityService');

async function regen() {
  const researchPath = path.join(__dirname, 'data/research-cache/mudra-loan-scheme-2026.master-research.json');
  const masterResearch = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

  // Run Content Generation (will trigger Normalization, FactGuard, Audit internally!)
  const articleResult = await generateArticle(masterResearch);

  let docxPass = false;
  try {
    const buffer = await generateDocx(articleResult);
    if (buffer && buffer.length > 0) docxPass = true;
  } catch (err) {
    console.error(err);
  }

  let sanityPass = false;
  try {
    const previewRes = await previewDraft(articleResult, "mock");
    if (previewRes) sanityPass = true;
  } catch (err) {
    console.error(err);
  }

  const str = JSON.stringify(articleResult);
  
  const currencyBroken = /20\s*lakh\s*₹/.test(str) || /50,000\s*₹/.test(str) || /₹\s*₹/.test(str) ? 'FAIL' : '0';
  const tarunPlus = /available only where the borrower has successfully repaid a previous Tarun loan/.test(str) ? 'present' : 'missing';
  const agric = /allied-to-agriculture activities such as poultry, dairy and beekeeping/.test(str) ? 'correct' : 'missing';
  const srcGround = /Department of Financial Services \/ Ministry of Finance/.test(str) ? 'present' : 'missing';
  const verified = /"Last Verified":"29 September 2026"/.test(str) || /Last Verified: 29 September 2026/.test(str) ? 'present' : 'missing';
  
  const fgFailures = articleResult.audit?.failures?.filter(f => f.includes('FactGuard')).length || 0;
  if (fgFailures > 0) {
    console.log("FACTGUARD FAILURES:", articleResult.audit.failures.filter(f => f.includes('FactGuard')));
  }
  const cov = articleResult.criticalFactCoverage?.coveragePercent || 0;
  const audit = articleResult.audit?.score || 0;
  const pub = articleResult.publishReadiness || 'blocked';
  
  const seoDesc = articleResult.seo?.metaDescription || "";
  
  let schemaDesc = "";
  if (articleResult.schema && articleResult.schema.schemaObject && Array.isArray(articleResult.schema.schemaObject["@graph"])) {
    const webpage = articleResult.schema.schemaObject["@graph"].find(g => g["@type"] === "WebPage");
    if (webpage) schemaDesc = webpage.description || "";
  }
  
  const finalOutput = {
    "FINAL STATUS": (currencyBroken === '0' && tarunPlus === 'present' && agric === 'correct' && srcGround === 'present' && fgFailures === 0 && schemaDesc === seoDesc) ? "PASS" : "FAIL",
    "Broken ₹ instances": currencyBroken,
    "Tarun Plus condition": tarunPlus,
    "Allied-to-agriculture corrected": agric,
    "Official source grounding": srcGround,
    "Last Verified": verified,
    "SEO Title": articleResult.seo?.metaTitle,
    "SEO Description": seoDesc,
    "SEO Description characters": seoDesc.length,
    "JSON-LD metadata match": schemaDesc === seoDesc ? "PASS" : "FAIL",
    "FactGuard failures": fgFailures,
    "CriticalFactCoverage": cov,
    "Audit": audit,
    "publishReadiness": pub,
    "DOCX": docxPass ? "PASS" : "FAIL",
    "Sanity Preview": sanityPass ? "PASS" : "FAIL",
    "Sanity mutations": 0
  };

  console.log("=== OUTPUT_START ===");
  console.log(JSON.stringify(finalOutput, null, 2));

  console.log("\n--- Final Loan Categories section ---");
  console.log(JSON.stringify(articleResult.article?.financialAssistance, null, 2));
  
  console.log("\n--- Final Eligibility section ---");
  console.log(JSON.stringify(articleResult.article?.eligibility, null, 2));
  
  console.log("\n--- Corrected FAQ about agriculture/allied activities ---");
  const agFaq = articleResult.article?.faqs?.find(f => JSON.stringify(f).includes("agriculture"));
  console.log(JSON.stringify(agFaq, null, 2));
  
  console.log("\n--- Final SEO Description ---");
  console.log(seoDesc);
}

regen();
