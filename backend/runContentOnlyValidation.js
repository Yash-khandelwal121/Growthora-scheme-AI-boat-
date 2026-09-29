require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./src/services/contentService');
const { generateDocx } = require('./src/services/docxService');
const { previewDraft } = require('./src/services/sanityService');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');

async function runContentOnlyValidation() {
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - FINAL CONTENT-ONLY VALIDATION");
  console.log("==================================================");

  const slug = "mudra-loan-scheme-2026";
  const researchPath = path.join(__dirname, 'data/research-cache', `${slug}.master-research.json`);

  if (!fs.existsSync(researchPath)) {
    console.error("Master research JSON not found:", researchPath);
    process.exit(1);
  }

  const masterResearch = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

  // Ensure CriticalFactCoverage is evaluated
  const coverageData = calculateCriticalFactCoverage(masterResearch);
  console.log(`Master Research CriticalFactCoverage: ${coverageData.coveragePercent}%`);

  try {
    console.log("\n[STAGE 1] Running Content Generation...");
    const articleResult = await generateArticle(masterResearch);

    console.log("\n[STAGE 2] Running FactGuard & Audit Checks...");
    const factGuardFailures = articleResult.audit?.failures?.filter(f => f.includes('FactGuard')).length || 0;
    const coveragePercent = articleResult.criticalFactCoverage?.coveragePercent || coverageData.coveragePercent;
    const auditScore = articleResult.audit?.score || 0;
    const publishReadiness = articleResult.publishReadiness || "blocked";

    const keyBenefitsCount = (articleResult.article?.keyBenefits || []).length;
    const eligibilityCount = (articleResult.article?.eligibility || []).length;
    const documentsCount = (articleResult.article?.documentsRequired || []).length;
    const faqsCount = (articleResult.article?.faqs || []).length;

    let allKws = [];
    if (articleResult.seo?.primaryKeyword) allKws.push(articleResult.seo.primaryKeyword);
    if (Array.isArray(articleResult.seo?.secondaryKeywords)) {
      allKws = allKws.concat(articleResult.seo.secondaryKeywords);
    }
    const uniqueKws = Array.from(new Set(allKws.filter(Boolean).map(k => k.trim().toLowerCase())));
    const keywordsCount = uniqueKws.length;

    const actualSlug = articleResult.seo?.slug || "";
    const actualCanonical = articleResult.seo?.canonicalPath || "";

    // Content checks
    const fullContentStr = JSON.stringify(articleResult);
    const hasPmegp8thPass = fullContentStr.toLowerCase().includes("8th pass mandatory");
    const hasPmegpLimits = fullContentStr.includes("50 lakh") && fullContentStr.includes("manufacturing project limit");
    const hasPmegpSubsidy = fullContentStr.toLowerCase().includes("kvic 35% subsidy");

    const hasShishu = fullContentStr.toLowerCase().includes("shishu");
    const hasKishore = fullContentStr.toLowerCase().includes("kishor");
    const hasTarun = fullContentStr.toLowerCase().includes("tarun");

    console.log("\n[STAGE 3] Generating DOCX & Sanity Preview...");
    let docxPass = false;
    try {
      const buffer = await generateDocx(articleResult);
      if (buffer && buffer.length > 0) docxPass = true;
    } catch (err) {
      console.error("DOCX generation error:", err.message);
    }

    let sanityPreviewPass = false;
    try {
      const previewRes = await previewDraft(articleResult, "schemeCategory_finance");
      if (previewRes && previewRes.payload && previewRes.payload._id) sanityPreviewPass = true;
    } catch (err) {
      console.error("Sanity preview error:", err.message);
    }

    const expectedCanonical = `https://growthora.co.in/govtschemes/${slug}`;

    const pass = (
      factGuardFailures === 0 &&
      coveragePercent === 100 &&
      auditScore >= 95 &&
      publishReadiness === "ready" &&
      keyBenefitsCount === 5 &&
      eligibilityCount === 5 &&
      documentsCount === 5 &&
      faqsCount === 15 &&
      keywordsCount === 20 &&
      !hasPmegp8thPass &&
      !hasPmegpLimits &&
      !hasPmegpSubsidy &&
      hasShishu &&
      hasKishore &&
      hasTarun &&
      actualSlug === slug &&
      actualCanonical === expectedCanonical &&
      docxPass &&
      sanityPreviewPass
    );

    console.log("\n==================================================");
    console.log(`FINAL STATUS: ${pass ? 'PASS' : 'FAIL'}`);
    console.log("==================================================");
    console.log(``);
    console.log(`Content generation: ${articleResult.success !== false ? 'PASS' : 'FAIL'}`);
    console.log(`FactGuard failures: ${factGuardFailures}`);
    console.log(`CriticalFactCoverage: ${coveragePercent}%`);
    console.log(`Audit: ${auditScore}`);
    console.log(`publishReadiness: ${publishReadiness}`);
    console.log(``);
    console.log(`Benefits: ${keyBenefitsCount} unique`);
    console.log(`Eligibility: ${eligibilityCount} unique`);
    console.log(`Documents: ${documentsCount} unique`);
    console.log(`FAQs: ${faqsCount}`);
    console.log(`SEO Keywords: ${keywordsCount} unique`);
    console.log(``);
    console.log(`Slug: ${actualSlug}`);
    console.log(`Canonical: ${actualCanonical}`);
    console.log(``);
    console.log(`DOCX: ${docxPass ? 'PASS' : 'FAIL'}`);
    console.log(`Sanity Preview: ${sanityPreviewPass ? 'PASS' : 'FAIL'}`);
    console.log(`Sanity mutations: 0`);

    if (!pass) {
      console.log("\n--- REMAINING FAILURES DETAILS ---");
      if (factGuardFailures > 0) console.log(`- FactGuard failures count: ${factGuardFailures}`);
      if (coveragePercent !== 100) console.log(`- CriticalFactCoverage is ${coveragePercent}% (expected 100%)`);
      if (auditScore < 95) console.log(`- Audit score is ${auditScore} (expected >= 95)`);
      if (publishReadiness !== "ready") console.log(`- publishReadiness is ${publishReadiness} (expected 'ready')`);
      if (keyBenefitsCount !== 5) console.log(`- Benefits count is ${keyBenefitsCount} (expected 5)`);
      if (eligibilityCount !== 5) console.log(`- Eligibility count is ${eligibilityCount} (expected 5)`);
      if (documentsCount !== 5) console.log(`- Documents count is ${documentsCount} (expected 5)`);
      if (faqsCount !== 15) console.log(`- FAQs count is ${faqsCount} (expected 15)`);
      if (keywordsCount !== 20) console.log(`- SEO Keywords count is ${keywordsCount} (expected 20)`);
      if (hasPmegp8thPass) console.log("- Content contains PMEGP 8th pass rule");
      if (hasPmegpLimits) console.log("- Content contains PMEGP limits");
      if (hasPmegpSubsidy) console.log("- Content contains PMEGP subsidy");
      if (!hasShishu || !hasKishore || !hasTarun) console.log("- Missing Mudra loan categories");
      if (actualSlug !== slug) console.log(`- Slug mismatch: expected ${slug}, got ${actualSlug}`);
      if (actualCanonical !== expectedCanonical) console.log(`- Canonical mismatch: expected ${expectedCanonical}, got ${actualCanonical}`);
      if (!docxPass) console.log("- DOCX generation failed");
      if (!sanityPreviewPass) console.log("- Sanity preview failed");
    }

  } catch (err) {
    console.error("\nExecution Error:", err);
    console.log("\nFINAL STATUS: FAIL");
    console.log(`Error: ${err.message}`);
  }
}

runContentOnlyValidation();
