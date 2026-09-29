const { analyzeSourceAuthority } = require('../utils/sourceAuthority');
const { dedupeSources } = require('../utils/dedupeSources');
const { logInfo } = require('../utils/logger');

function resolveFacts(researchContext, openaiResult, geminiResult, claudeResult) {
  logInfo('Resolving facts to build Master Scheme Research JSON');

  const allSources = [];
  if (openaiResult && openaiResult.sources) allSources.push(...openaiResult.sources);
  if (geminiResult && geminiResult.sources) allSources.push(...geminiResult.sources);
  if (claudeResult && claudeResult.sources) allSources.push(...claudeResult.sources);

  // Analyze authority and dedupe
  const enrichedSources = allSources.map(s => {
    const analysis = analyzeSourceAuthority(s.url);
    return {
      ...s,
      domain: analysis.domain,
      authorityLevel: analysis.authorityLevel,
      authorityScore: analysis.authorityScore
    };
  });
  
  const finalSources = dedupeSources(enrichedSources);
  const officialSourcesFound = finalSources.filter(s => s.authorityScore >= 95).length;

  // Extremely basic conflict resolution for demonstration. 
  // In a robust system, this would iterate field by field comparing authority scores.
  // Here we prefer Claude's verified result if available, otherwise Gemini, otherwise OpenAI.
  const baseScheme = (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.scheme) ||
                     (geminiResult && geminiResult.scheme) || 
                     (openaiResult && openaiResult.scheme) || {};

  const baseOverview = (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.overview) ||
                       (geminiResult && geminiResult.overview) || 
                       (openaiResult && openaiResult.overview) || {};

  const baseFinancial = (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.financialAssistance) ||
                        (geminiResult && geminiResult.financialAssistance) || 
                        (openaiResult && openaiResult.financialAssistance) || {};
                        
  const baseEligibility = (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.eligibility) ||
                          (geminiResult && geminiResult.eligibility) || 
                          (openaiResult && openaiResult.eligibility) || {};

  const baseDates = (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.importantDates) ||
                    (geminiResult && geminiResult.importantDates) || 
                    (openaiResult && openaiResult.importantDates) || {};

  // Compute confidence
  let overallConfidence = { level: 'unverified', score: 0.1 };
  const successfulProviders = [openaiResult, geminiResult, claudeResult].filter(Boolean).length;
  
  if (successfulProviders === 3 && officialSourcesFound >= 1) {
    overallConfidence = { level: 'high', score: 0.95 };
  } else if (successfulProviders >= 2 || officialSourcesFound >= 1) {
    overallConfidence = { level: 'medium', score: 0.75 };
  } else if (successfulProviders === 1) {
    overallConfidence = { level: 'low', score: 0.5 };
  }

  const conflictsFound = claudeResult && claudeResult.conflictsIdentified ? claudeResult.conflictsIdentified : [];
  const needsHumanReview = [];
  
  if (overallConfidence.level === 'low' || overallConfidence.level === 'unverified') {
    needsHumanReview.push("Overall confidence is low. Please review all critical facts.");
  }

  if (conflictsFound.length > 0) {
    conflictsFound.forEach(c => {
      if (!c.resolution) {
        needsHumanReview.push("Unresolved conflict in " + c.field + ": OpenAI (" + c.openaiValue + ") vs Gemini (" + c.geminiValue + ")");
      }
    });
  }

  return {
    researchId: require('crypto').randomUUID(),
    generatedAt: new Date().toISOString(),
    researchDate: researchContext.researchDate,
    input: researchContext,
    scheme: baseScheme,
    overview: baseOverview,
    financialAssistance: baseFinancial,
    benefits: (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.benefits) || [],
    eligibility: baseEligibility,
    documentsRequired: (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.documentsRequired) || [],
    applicationProcess: (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.applicationProcess) || [],
    importantDates: baseDates,
    officialContact: (claudeResult && claudeResult.verifiedFacts && claudeResult.verifiedFacts.officialContact) || {},
    sources: finalSources,
    verification: {
      openaiCompleted: !!openaiResult,
      geminiCompleted: !!geminiResult,
      claudeCompleted: !!claudeResult,
      officialSourcesFound,
      conflictsFound,
      conflictsResolved: conflictsFound.filter(c => c.resolution),
      unresolvedConflicts: conflictsFound.filter(c => !c.resolution),
      needsHumanReview,
      overallConfidence
    }
  };
}

module.exports = {
  resolveFacts
};
