const { checkFactGuard } = require('../utils/factGuard');
const { auditContent } = require('../agents/contentAuditAgent');
const { generateSchema } = require('../agents/schemaAgent');
const mockArticleContent = require('../mocks/mockArticleContent');
const { logInfo, logError } = require('../utils/logger');
const { normalizeArticleContent } = require('../utils/contentNormalizer');
const { enforceMetaLimits } = require('../utils/metaValidator');

async function generateArticle(masterResearch) {
  if (!masterResearch || !masterResearch.researchId) {
    throw new Error("Invalid or incomplete master research JSON");
  }

  logInfo('Starting content orchestration', { researchId: masterResearch.researchId });

  const officialCount = masterResearch.verification?.officialSourcesFound !== undefined 
    ? masterResearch.verification.officialSourcesFound 
    : (masterResearch.sources || []).filter(s => s.authorityScore >= 95 || s.authorityLevel === 'official').length;

  if (officialCount === 0) {
    logError('Official source gate failed: 0 official sources found.');
    return {
      success: false,
      errorCategory: "INSUFFICIENT_OFFICIAL_EVIDENCE",
      message: "No official source evidence was retrieved for this scheme.",
      publishReadiness: "blocked",
      audit: { score: 0, failures: [] },
      criticalFactCoverage: { coveragePercent: 0 }
    };
  }

  // HARD PRE-CONTENT COVERAGE GATE
  const { calculateCriticalFactCoverage } = require('../utils/criticalFactCoverage');
  const coverageData = calculateCriticalFactCoverage(masterResearch);
  const coveragePercent = coverageData.coveragePercent;

  if (coveragePercent < 95) {
    logError(`Hard Pre-Content Coverage Gate Failed: CriticalFactCoverage is ${coveragePercent}% (required >= 95%). Skipping AI content generation.`);
    return {
      success: false,
      stage: "research_coverage",
      errorCategory: "INSUFFICIENT_CRITICAL_FACT_COVERAGE",
      message: `Critical fact coverage is ${coveragePercent}%, which is below the 95% threshold required to generate content.`,
      criticalFactCoverage: coveragePercent,
      publishReadiness: "blocked",
      missingCriticalFields: coverageData.nullCriticalFields || [],
      contentCallsSkippedDueToCoverageGate: true,
      audit: { score: 0, failures: [`Critical fact coverage ${coveragePercent}% is below required 95% threshold.`] }
    };
  }

  const { isMockContentEnabled } = require('../config/runtime');
  
  const isMock = isMockContentEnabled();
  
  const timingMetrics = {
    ...(masterResearch.timingMetrics || {
      tavilyResearchMs: 0,
      sourceFilteringMs: 0,
      evidenceExtractionMs: 0,
      normalizationMs: 0,
      verificationMs: 0
    }),
    contentGenerationMs: 0,
    factGuardMs: 0,
    auditMs: 0,
    docxMs: 0,
    sanityPreviewMs: 0,
    totalMs: 0
  };

  let articleData;
  const contentStart = Date.now();
  if (isMock) {
    logInfo('Content mode: MOCK');
    const { buildDynamicMockArticle } = require('../mocks/mockArticleContent');
    articleData = buildDynamicMockArticle ? buildDynamicMockArticle(masterResearch) : JSON.parse(JSON.stringify(mockArticleContent));
  } else {
    logInfo('Content mode: LIVE');
    const { runGroqContentWriter } = require('../agents/groqContentWriterAgent');
    articleData = await runGroqContentWriter(masterResearch);
  }
  timingMetrics.contentGenerationMs = Date.now() - contentStart;

  // 1. Content Normalization & Classification & Rupee Currency Formatting
  articleData = normalizeArticleContent(articleData, masterResearch);

  // 2. Fact Guard Validation
  const fgStart = Date.now();
  const factGuardResult = checkFactGuard(articleData, masterResearch);
  timingMetrics.factGuardMs = Date.now() - fgStart;

  // 3. Enforce Metadata Length Limits & Deterministic Slug AFTER FactGuard
  if (articleData.seo) {
    const targetSlug = masterResearch.schemeSlug || masterResearch.slug || articleData.seo.slug;
    if (targetSlug) {
      articleData.seo.slug = targetSlug;
      articleData.seo.canonicalPath = `https://growthora.co.in/govtschemes/${targetSlug}`;
    }
    articleData.seo = enforceMetaLimits(articleData.seo);
  }

  // 4. Generate Schema (JSON-LD) AFTER final SEO metadata validation
  const schemaResult = generateSchema(articleData);

  const criticalFactsWithoutSource = coverageData.criticalFactsWithoutSource;
  const criticalFactsWithSource = coverageData.criticalFactsWithSource;
  const nullCriticalFields = coverageData.nullCriticalFields;
  const criticalFactCoverage = {
    requiredCriticalFacts: coverageData.requiredCriticalFacts,
    extractedCriticalFacts: coverageData.extractedCriticalFacts,
    sourceSupportedCriticalFacts: coverageData.sourceSupportedCriticalFacts,
    coveragePercent: coverageData.coveragePercent
  };

  // 5. Audit Content
  const auditStart = Date.now();
  const auditResult = auditContent(articleData, factGuardResult, masterResearch, criticalFactsWithoutSource, criticalFactCoverage, nullCriticalFields);
  timingMetrics.auditMs = Date.now() - auditStart;

  timingMetrics.totalMs = (masterResearch.timingMetrics?.totalMs || 0) +
    timingMetrics.contentGenerationMs +
    timingMetrics.factGuardMs +
    timingMetrics.auditMs;

  // Assemble Final JSON
  const finalArticle = {
    mode: isMock ? "mock" : "live",
    liveContentGeneration: !isMock,
    sourceResearchId: masterResearch.researchId,
    researchSchemeName: masterResearch.scheme?.name || "",
    schemeType: articleData.schemeType,
    financialHeading: articleData.financialHeading,
    searchIntent: articleData.searchIntent,
    primaryUserQuestion: articleData.primaryUserQuestion,
    secondaryUserQuestions: articleData.secondaryUserQuestions,
    seo: articleData.seo,
    article: articleData.article,
    internalLinkRecommendations: articleData.internalLinkRecommendations,
    externalSourceRecommendations: articleData.externalSourceRecommendations,
    schema: schemaResult,
    sources: masterResearch.sources || [],
    audit: auditResult,
    humanReview: [],
    issuesRequiringVerification: articleData.issuesRequiringVerification || [],
    criticalFactCoverage,
    publishReadiness: auditResult.passed ? "ready" : "needs_review",
    timingMetrics
  };

  if (!factGuardResult.passed) {
    finalArticle.humanReview.push("FactGuard detected unsupported facts. Review audit failures.");
  }
  
  if (masterResearch.verification && masterResearch.verification.needsHumanReview) {
    finalArticle.humanReview.push(...masterResearch.verification.needsHumanReview);
  }

  if (criticalFactsWithoutSource.length > 0) {
    finalArticle.humanReview.push(`Critical facts lack explicit source support: ${criticalFactsWithoutSource.join(', ')}`);
    if (masterResearch.verification?.overallConfidence?.level === 'high') {
      masterResearch.verification.overallConfidence.level = 'medium';
    }
  }

  if (nullCriticalFields.length > 0) {
    finalArticle.humanReview.push(`Null critical fields detected: ${nullCriticalFields.join(', ')}`);
  }

  finalArticle.sourceTrace = {
    withSource: criticalFactsWithSource,
    withoutSource: criticalFactsWithoutSource,
    nullFields: nullCriticalFields
  };

  // 6. Publish Readiness
  let readiness = "ready";
  
  let hasUnresolvedConflicts = false;
  if (masterResearch.conflictLog && masterResearch.conflictLog.length > 0) {
    hasUnresolvedConflicts = masterResearch.conflictLog.some(c => c.resolution && c.resolution.toLowerCase().includes("secondary"));
  }

  if (
    !factGuardResult.passed || 
    criticalFactsWithoutSource.length > 0 || 
    auditResult.score < 95 || 
    !finalArticle.liveContentGeneration || 
    coveragePercent < 95 ||
    hasUnresolvedConflicts
  ) {
    if (!factGuardResult.passed || criticalFactsWithoutSource.length > 0 || coveragePercent < 95 || hasUnresolvedConflicts) {
      readiness = "blocked";
    } else {
      readiness = "needs_review";
    }
  }

  // Mandatory unresolved facts override
  const mandatoryFields = ["scheme.implementingAgency", "financialAssistance.grantAmount", "financialAssistance.maxProjectCost.manufacturing"];
  const missingMandatory = nullCriticalFields.filter(f => mandatoryFields.includes(f));
  if (missingMandatory.length > 0) {
    readiness = "blocked";
    finalArticle.humanReview.push(`Mandatory critical facts are unresolved: ${missingMandatory.join(', ')}`);
  }

  finalArticle.publishReadiness = readiness;

  logInfo('Content orchestration completed successfully', { researchId: masterResearch.researchId });
  
  return finalArticle;
}

module.exports = {
  generateArticle
};
