const { countWords } = require('../utils/contentMetrics');
const { validateMetadata } = require('../utils/metaValidator');

function auditContent(articleData, factGuardResult, researchJson, criticalFactsWithoutSource = [], criticalFactCoverage = {}, nullCriticalFields = []) {
  const checks = [];
  const failures = [];
  const warnings = [];
  
  let scores = {
    seo: 100,
    aeo: 100,
    geo: 100,
    eeat: 100,
    contentQuality: 100,
    searchIntent: 100
  };

  const article = articleData.article || {};
  const seo = articleData.seo || {};

  // SEO
  if (article.h1) {
    checks.push("SEO: H1 is present");
  } else {
    failures.push("SEO: Missing H1");
    scores.seo -= 10;
  }
  
  const metaVal = validateMetadata(seo);
  if (metaVal.passed) {
    checks.push("SEO: Metadata lengths are within limits");
  } else {
    metaVal.failures.forEach(f => failures.push("SEO: " + f));
    scores.seo -= 10;
  }

  const kw = (seo.primaryKeyword || "").toLowerCase();
  if (kw) {
    const h1HasKw = (article.h1 || "").toLowerCase().includes(kw);
    const snippetHasKw = (article.snippetAnswer || "").toLowerCase().includes(kw);
    if (h1HasKw && snippetHasKw) {
      checks.push("SEO: Primary keyword used naturally in H1 and Snippet");
    } else {
      warnings.push("SEO: Primary keyword might be missing from H1 or Snippet");
      scores.seo -= 5;
    }
    
    // Official name correct (no year injected)
    const officialNameStr = researchJson.scheme?.name || "";
    const yearMatch = kw.match(/\d{4}/);
    if (yearMatch) {
      const kwYear = yearMatch[0];
      if (!officialNameStr.includes(kwYear) && article.schemeAtAGlance && article.schemeAtAGlance["Official Scheme Name"]) {
        if (article.schemeAtAGlance["Official Scheme Name"].includes(kwYear)) {
          failures.push("SEO/EEAT: Official Scheme Name incorrectly inherited the SEO keyword year");
          scores.seo -= 10;
          scores.eeat -= 10;
        }
      }
    }
  }

  // AEO
  const snippetWords = countWords(article.snippetAnswer);
  if (snippetWords >= 40 && snippetWords <= 65) {
    checks.push("AEO: Snippet length is optimal (" + snippetWords + " words)");
  } else {
    failures.push("AEO: Snippet length out of optimal bounds (actual: " + snippetWords + " words)");
    scores.aeo -= 10;
  }
  
  const faqCount = Array.isArray(article.faqs) ? article.faqs.length : 0;
  if (faqCount === 15) {
    checks.push("AEO: Exactly 15 FAQs present");
  } else {
    failures.push("AEO: FAQ count is not 15 (actual: " + faqCount + ")");
    scores.aeo -= 15;
  }
  
  if (article.applicationProcess && article.applicationProcess.length > 0) {
    checks.push("AEO: Application process is present and formatted");
  } else {
    warnings.push("AEO: Missing structured application process");
    scores.aeo -= 5;
  }

  // GEO
  const glanceStr = JSON.stringify(article.schemeAtAGlance || {});
  if (glanceStr.toLowerCase().includes("ministry") || glanceStr.toLowerCase().includes("agency") || glanceStr.toLowerCase().includes("beneficiaries")) {
    checks.push("GEO: Key entities (Who/What) identified in Scheme at a Glance");
  } else {
    warnings.push("GEO: Scheme at a Glance might be missing key entity relationships");
    scores.geo -= 10;
  }

  if (criticalFactsWithoutSource.some(f => f.startsWith('scheme.'))) {
    failures.push("GEO: Critical scheme entities lack explicit source support");
    scores.geo -= 20;
  } else {
    checks.push("GEO: Scheme entities supported by sources");
  }

  if (criticalFactCoverage && criticalFactCoverage.coveragePercent < 80) {
    failures.push(`GEO: Low critical fact coverage (${criticalFactCoverage.coveragePercent}%)`);
    scores.geo -= 15;
    scores.eeat -= 10;
  } else if (criticalFactCoverage) {
    checks.push(`GEO: Strong critical fact coverage (${criticalFactCoverage.coveragePercent}%)`);
  }

  // EEAT
  if (!factGuardResult.passed) {
    factGuardResult.unsupportedFacts.forEach(f => failures.push("EEAT FactGuard: " + f));
    scores.eeat -= 20;
  } else {
    checks.push("EEAT: FactGuard passed (all critical entities supported)");
  }

  if (criticalFactsWithoutSource.length > 0) {
    failures.push(`EEAT: ${criticalFactsWithoutSource.length} critical facts lack explicit sourceIds`);
    scores.eeat -= 20;
  }

  if (nullCriticalFields.length > 0) {
    failures.push(`EEAT: ${nullCriticalFields.length} critical fields were not extracted (null)`);
    scores.eeat -= Math.min(20, nullCriticalFields.length * 5);
  }

  const finAssistStr = JSON.stringify(article.financialAssistance || []);
  const outlay = researchJson.scheme?.programOutlay || "";
  if (outlay && finAssistStr.includes(outlay)) {
    failures.push("EEAT: Program Outlay appears inside Financial Assistance for beneficiary");
    scores.eeat -= 10;
  }

  if (finAssistStr.includes("sourceIds")) {
    checks.push("EEAT: Source IDs preserved in factual sections");
  } else {
    warnings.push("EEAT: Factual sections may lack sourceIds");
  }

  // Required Schema Fields (PART 14 & PART 19)
  if (article.detailedDescription) {
    checks.push("Content Quality: detailedDescription is present");
  } else {
    failures.push("Content Quality: Missing required field detailedDescription");
    scores.contentQuality -= 25;
  }

  const benefitsCount = Array.isArray(article.keyBenefits) ? article.keyBenefits.length : 0;
  if (benefitsCount >= 5) {
    checks.push("Content Quality: At least 5 keyBenefits present (" + benefitsCount + ")");
  } else {
    failures.push("Content Quality: keyBenefits must contain at least 5 unique items (actual: " + benefitsCount + ")");
    scores.contentQuality -= 25;
  }

  const eligibilityCount = Array.isArray(article.eligibility) ? article.eligibility.length : 0;
  if (eligibilityCount >= 5) {
    checks.push("Content Quality: At least 5 eligibility items present (" + eligibilityCount + ")");
  } else {
    failures.push("Content Quality: eligibility must contain at least 5 unique items (actual: " + eligibilityCount + ")");
    scores.contentQuality -= 20;
  }

  const docsCount = Array.isArray(article.documentsRequired) ? article.documentsRequired.length : 0;
  if (docsCount >= 5) {
    checks.push("Content Quality: At least 5 documentsRequired items present (" + docsCount + ")");
  } else {
    failures.push("Content Quality: documentsRequired must contain at least 5 unique items (actual: " + docsCount + ")");
    scores.contentQuality -= 20;
  }

  // Content Quality AI Cliches & Guarantees
  const articleStr = JSON.stringify(article).toLowerCase();
  if (articleStr.includes("100% approval") || articleStr.includes("guaranteed funding")) {
    failures.push("Content Quality: Fake guarantees detected");
    scores.contentQuality -= 15;
  }
  if (articleStr.includes("in today's fast-paced world") || articleStr.includes("game-changer")) {
    failures.push("Content Quality: Overused AI cliches detected");
    scores.contentQuality -= 10;
  } else {
    checks.push("Content Quality: No obvious AI cliches detected");
  }

  // Search Intent
  if (articleData.searchIntent) {
    checks.push("Search Intent: Analyzed and captured (" + articleData.searchIntent + ")");
  } else {
    failures.push("Search Intent: Missing searchIntent field");
    scores.searchIntent -= 15;
  }

  const totalScore = Math.floor(
    (scores.seo + scores.aeo + scores.geo + scores.eeat + scores.contentQuality + scores.searchIntent) / 6
  );

  return {
    passed: failures.length === 0,
    score: Math.max(0, totalScore),
    categoryScores: {
      seo: Math.max(0, scores.seo),
      aeo: Math.max(0, scores.aeo),
      geo: Math.max(0, scores.geo),
      eeat: Math.max(0, scores.eeat),
      contentQuality: Math.max(0, scores.contentQuality),
      searchIntent: Math.max(0, scores.searchIntent)
    },
    checks,
    warnings,
    failures
  };
}

module.exports = {
  auditContent
};
