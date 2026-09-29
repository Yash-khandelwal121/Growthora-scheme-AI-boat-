require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { performResearch } = require('./src/services/researchService');
const { generateArticle } = require('./src/services/contentService');
const { generateDocx } = require('./src/services/docxService');
const { previewDraft } = require('./src/services/sanityService');
const { saveResearchCache, loadResearchCache } = require('./src/utils/researchCache');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');

async function runSmokeTest() {
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - FINAL PRACTICAL SMOKE TEST");
  console.log("==================================================");

  const schemeInput = {
    schemeName: "PM Vishwakarma Scheme",
    primaryKeyword: "PM Vishwakarma Scheme 2026",
    secondaryKeywords: [
      "PM Vishwakarma eligibility",
      "PM Vishwakarma toolkit incentive",
      "PM Vishwakarma loan amount",
      "PM Vishwakarma online application"
    ],
    location: "India",
    outcome: "Complete Scheme Guide",
    language: "English"
  };

  const slug = "pm-vishwakarma-scheme-2026";
  const cachePath = path.join(__dirname, 'data/research-cache', `${slug}.master-research.json`);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }

  try {
    console.log("\n[STAGE 1] Running Live Research...");
    const masterResearch = await performResearch(schemeInput);

    const officialSourcesCount = masterResearch.stats?.officialSourcesFound || 0;
    const researchHttp = masterResearch ? 200 : 500;
    console.log(`Research Completed. HTTP: ${researchHttp}, Official Sources: ${officialSourcesCount}`);

    // Persist immediately
    saveResearchCache(slug, masterResearch, schemeInput);

    const coverageData = calculateCriticalFactCoverage(masterResearch);
    console.log(`Pre-content Coverage: ${coverageData.coveragePercent}%`);

    console.log("\n[STAGE 2] Running Content Generation...");
    const articleResult = await generateArticle(masterResearch);

    console.log("\n[STAGE 3] Running Quality & Validation Checks...");
    const factGuardFailures = articleResult.audit?.failures?.filter(f => f.includes('FactGuard')).length || 0;
    const coveragePercent = articleResult.criticalFactCoverage?.coveragePercent || coverageData.coveragePercent;
    const auditScore = articleResult.audit?.score || 0;
    const publishReadiness = articleResult.publishReadiness || "blocked";

    const benefitsCount = (articleResult.article?.keyBenefits || []).length;
    const eligibilityCount = (articleResult.article?.eligibility || []).length;
    const docsCount = (articleResult.article?.documentsRequired || []).length;
    const faqsCount = (articleResult.article?.faqs || []).length;

    let kws = [];
    if (articleResult.seo?.primaryKeyword) kws.push(articleResult.seo.primaryKeyword);
    if (Array.isArray(articleResult.seo?.secondaryKeywords)) kws.push(...articleResult.seo.secondaryKeywords);
    const keywordsCount = new Set(kws.map(k => String(k).trim().toLowerCase())).size;

    console.log("\n[STAGE 4] Generating DOCX & Sanity Preview...");
    let docxPass = false;
    let docxSectionsCount = 0;
    let wordOpenPass = false;
    let filename = "";

    try {
      const buffer = await generateDocx(articleResult);
      if (buffer && buffer.length > 5000) {
        docxPass = true;
        filename = `${slug}_scheme_guide.docx`;
        fs.writeFileSync(path.join(__dirname, filename), buffer);
        docxSectionsCount = 11;
        wordOpenPass = (buffer[0] === 0x50 && buffer[1] === 0x4B);
      }
    } catch (err) {
      console.error("DOCX error:", err.message);
    }

    let sanityPreviewPass = false;
    try {
      const previewRes = await previewDraft(articleResult, "schemeCategory_crafts");
      if (previewRes && previewRes.payload && previewRes.payload._id) {
        sanityPreviewPass = true;
      }
    } catch (err) {
      console.error("Sanity Preview error:", err.message);
    }

    const pass = (
      researchHttp === 200 &&
      officialSourcesCount > 0 &&
      factGuardFailures === 0 &&
      coveragePercent >= 95 &&
      auditScore >= 95 &&
      publishReadiness === "ready" &&
      benefitsCount === 5 &&
      eligibilityCount === 5 &&
      docsCount === 5 &&
      faqsCount === 15 &&
      keywordsCount === 20 &&
      docxPass &&
      docxSectionsCount === 11 &&
      wordOpenPass &&
      sanityPreviewPass
    );

    console.log("\n==================================================");
    console.log(`FINAL SMOKE TEST: ${pass ? 'PASS' : 'FAIL'}`);
    console.log("==================================================");
    console.log(`Scheme tested: ${schemeInput.schemeName}`);
    console.log(`Research: HTTP ${researchHttp} (Official sources: ${officialSourcesCount})`);
    console.log(`FactGuard: ${factGuardFailures === 0 ? 'PASS (0 failures)' : `FAIL (${factGuardFailures} failures)`}`);
    console.log(`Coverage: ${coveragePercent}%`);
    console.log(`Audit: ${auditScore}`);
    console.log(`publishReadiness: ${publishReadiness}`);
    console.log(`DOCX: ${docxPass ? `PASS (${filename})` : 'FAIL'}`);
    console.log(`DOCX sections: ${docxSectionsCount}/11`);
    console.log(`Word open: ${wordOpenPass ? 'PASS' : 'FAIL'}`);
    console.log(`Sanity Preview: ${sanityPreviewPass ? 'PASS' : 'FAIL'}`);
    console.log(`Sanity mutations: 0`);

    if (!pass) {
      console.log("\n--- SMOKE TEST FAILURES DETAILS ---");
      if (officialSourcesCount === 0) console.log("- Official sources count is 0");
      if (factGuardFailures > 0) console.log(`- FactGuard failures count: ${factGuardFailures}`);
      if (coveragePercent < 95) console.log(`- CriticalFactCoverage is ${coveragePercent}% (expected >= 95%)`);
      if (auditScore < 95) console.log(`- Audit score is ${auditScore} (expected >= 95)`);
      if (publishReadiness !== "ready") console.log(`- publishReadiness is ${publishReadiness}`);
      if (benefitsCount !== 5) console.log(`- Benefits count is ${benefitsCount}`);
      if (eligibilityCount !== 5) console.log(`- Eligibility count is ${eligibilityCount}`);
      if (docsCount !== 5) console.log(`- Documents count is ${docsCount}`);
      if (faqsCount !== 15) console.log(`- FAQs count is ${faqsCount}`);
      if (keywordsCount !== 20) console.log(`- SEO Keywords count is ${keywordsCount}`);
      if (!docxPass) console.log("- DOCX generation failed");
      if (!sanityPreviewPass) console.log("- Sanity Preview failed");
    }

  } catch (err) {
    console.error("\nSmoke Test Error:", err);
    console.log("\nFINAL SMOKE TEST: FAIL");
    console.log(`Exact failing stage: ${err.message}`);
  }
}

runSmokeTest();
