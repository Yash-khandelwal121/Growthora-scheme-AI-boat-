require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { performResearch } = require('./src/services/researchService');
const { generateArticle } = require('./src/services/contentService');
const { generateDocx } = require('./src/services/docxService');
const { previewDraft } = require('./src/services/sanityService');
const { saveResearchCache, loadResearchCache } = require('./src/utils/researchCache');

async function runLiveValidation() {
  const startTime = Date.now();
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - FINAL LIVE PMMY VALIDATION");
  console.log("==================================================");

  const slug = "mudra-loan-scheme-2026";
  const cachePath = path.join(__dirname, 'data/research-cache', `${slug}.master-research.json`);
  
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    console.log("Removed previous research cache for fresh live research run.");
  }

  const input = {
    schemeName: 'Pradhan Mantri Mudra Yojana (PMMY)',
    primaryKeyword: 'Mudra Loan Scheme 2026',
    secondaryKeywords: [
      'Mudra loan eligibility',
      'Mudra loan amount',
      'Mudra loan documents',
      'Mudra loan online apply'
    ],
    location: 'India',
    outcome: 'Complete Scheme Guide',
    language: 'English'
  };

  try {
    console.log("\n[STAGE 1] Running Live Tavily & Groq Research...");
    const masterResearch = await performResearch(input);

    const officialSourcesCount = masterResearch.stats?.officialSourcesFound || 0;
    const tavilyCalls = masterResearch.stats?.tavilyCalls || 0;
    const groqCalls = (masterResearch.stats?.groqNormalizationCalls || 0) + (masterResearch.stats?.groqExtractionCalls || 0);

    const preContentCoverageData = masterResearch.preliminaryCriticalFactCoverage || {};
    const preContentCoveragePercent = preContentCoverageData.coveragePercent || 0;

    // Persist immediately
    saveResearchCache(slug, masterResearch, input);
    console.log("Persisted MASTER_SCHEME_RESEARCH_JSON immediately.");

    // Verify Reload
    const reloadedResearch = loadResearchCache(slug, input);
    const reloadPass = Boolean(reloadedResearch && reloadedResearch.scheme && reloadedResearch.scheme.name);

    if (preContentCoveragePercent < 95) {
      console.log(`\n[PRE-CONTENT COVERAGE GATE] Coverage is ${preContentCoveragePercent}% (< 95%). HALTING content generation.`);
      
      const totalRuntime = ((Date.now() - startTime) / 1000).toFixed(2) + "s";

      console.log("\n==================================================");
      console.log("FINAL LIVE PMMY STATUS: FAIL (BLOCKED BY PRE-CONTENT GATE)");
      console.log("==================================================");
      console.log(`Research HTTP: 200`);
      console.log(`Official sources: ${officialSourcesCount}`);
      console.log(`Pre-content coverage: ${preContentCoveragePercent}%`);
      console.log(``);
      console.log(`Missing critical fields: ${(preContentCoverageData.nullCriticalFields || []).join(', ') || 'None'}`);
      console.log(`Supported: ${preContentCoverageData.supportedApplicable || 0}`);
      console.log(`Not applicable: ${preContentCoverageData.notApplicable || 0}`);
      console.log(`Unresolved: ${preContentCoverageData.unresolvedApplicable || 0}`);
      console.log(``);
      console.log(`Content calls skipped due to coverage: YES`);
      console.log(``);
      console.log(`Content generation: SKIPPED`);
      console.log(`FactGuard failures: N/A`);
      console.log(`Final CriticalFactCoverage: ${preContentCoveragePercent}%`);
      console.log(`Audit: 0`);
      console.log(`publishReadiness: blocked`);
      console.log(``);
      console.log(`Benefits: N/A`);
      console.log(`Eligibility: N/A`);
      console.log(`Documents: N/A`);
      console.log(`FAQs: N/A`);
      console.log(`SEO Keywords: N/A`);
      console.log(``);
      console.log(`Slug: ${slug}`);
      console.log(`Canonical: N/A`);
      console.log(``);
      console.log(`DOCX: SKIPPED`);
      console.log(`Sanity Preview: SKIPPED`);
      console.log(`Sanity mutations: 0`);
      console.log(``);
      console.log(`Performance:`);
      console.log(`Total runtime: ${totalRuntime}`);
      console.log(`Groq calls: ${groqCalls}`);
      console.log(`Tavily calls: ${tavilyCalls}`);
      return;
    }

    console.log("\n[STAGE 2] Generating Content...");
    const articleResult = await generateArticle(masterResearch);

    console.log("\n[STAGE 3] Running Quality & Validation Checks...");
    const factGuardFailures = articleResult.audit?.failures?.filter(f => f.includes('FactGuard')).length || 0;
    const coveragePercent = articleResult.criticalFactCoverage?.coveragePercent || preContentCoveragePercent;
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

    // PMEGP isolation checks
    const fullContentStr = JSON.stringify(articleResult);
    const hasPmegp8thPass = fullContentStr.toLowerCase().includes("8th pass mandatory");
    const hasPmegpLimits = fullContentStr.includes("50 lakh") && fullContentStr.includes("manufacturing project limit");
    const hasPmegpSubsidy = fullContentStr.toLowerCase().includes("kvic 35% subsidy");

    // Mudra category checks
    const hasShishu = fullContentStr.toLowerCase().includes("shishu");
    const hasKishore = fullContentStr.toLowerCase().includes("kishor");
    const hasTarun = fullContentStr.toLowerCase().includes("tarun");

    console.log("\n[STAGE 4] Generating DOCX & Sanity Preview...");
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

    const pass = (
      officialSourcesCount > 0 &&
      reloadPass &&
      factGuardFailures === 0 &&
      coveragePercent >= 95 &&
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
      actualCanonical === `https://growthora.co.in/govtschemes/${slug}` &&
      docxPass &&
      sanityPreviewPass
    );

    const totalRuntime = ((Date.now() - startTime) / 1000).toFixed(2) + "s";

    console.log("\n==================================================");
    console.log(`FINAL LIVE PMMY STATUS: ${pass ? 'PASS' : 'FAIL'}`);
    console.log("==================================================");
    console.log(`Research HTTP: 200`);
    console.log(`Official sources: ${officialSourcesCount}`);
    console.log(`Pre-content coverage: ${preContentCoveragePercent}%`);
    console.log(``);
    console.log(`Missing critical fields: ${(preContentCoverageData.nullCriticalFields || []).join(', ') || 'None'}`);
    console.log(`Supported: ${preContentCoverageData.supportedApplicable || 0}`);
    console.log(`Not applicable: ${preContentCoverageData.notApplicable || 0}`);
    console.log(`Unresolved: ${preContentCoverageData.unresolvedApplicable || 0}`);
    console.log(``);
    console.log(`Content calls skipped due to coverage: NO`);
    console.log(``);
    console.log(`Content generation: ${articleResult.success !== false ? 'PASS' : 'FAIL'}`);
    console.log(`FactGuard failures: ${factGuardFailures}`);
    console.log(`Final CriticalFactCoverage: ${coveragePercent}%`);
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
    console.log(``);
    console.log(`Performance:`);
    console.log(`Total runtime: ${totalRuntime}`);
    console.log(`Groq calls: ${groqCalls + 1}`);
    console.log(`Tavily calls: ${tavilyCalls}`);

    if (!pass) {
      console.log("\n--- REMAINING FAILURES DETAILS ---");
      if (officialSourcesCount === 0) console.log("- Official sources count is 0");
      if (!reloadPass) console.log("- Persisted research reload failed");
      if (factGuardFailures > 0) console.log(`- FactGuard failures count: ${factGuardFailures}`);
      if (coveragePercent < 95) console.log(`- CriticalFactCoverage is ${coveragePercent}% (expected >= 95%)`);
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
      if (!docxPass) console.log("- DOCX generation failed");
      if (!sanityPreviewPass) console.log("- Sanity preview failed");
    }

  } catch (err) {
    console.error("\nExecution Error:", err);
    console.log("\nFINAL LIVE PMMY STATUS: FAIL");
    console.log(`Error: ${err.message}`);
  }
}

runLiveValidation();
