const { getTavilyApiKey, isTavilyConfigured } = require('../config/tavily');
const { getGroqClient, getResearchFallbackModels } = require('../config/groq');
const { logInfo, logError, logWarning } = require('../utils/logger');
const { analyzeSourceAuthority } = require('../utils/sourceAuthority');
const { withGroqRetry } = require('../utils/groqRetry');
const { parseAIJson } = require('../utils/parseAIJson');
const { researchSchema } = require('../utils/researchSchema');
const { calculateCriticalFactCoverage } = require('../utils/criticalFactCoverage');

async function runTavilyLiveWebResearch(researchContext) {
  if (!isTavilyConfigured()) {
    throw new Error('Tavily is not configured');
  }

  const apiKey = getTavilyApiKey();
  logInfo('Starting Tavily Live Web Research (Parallelized)', { schemeName: researchContext.schemeName });

  const timingMetrics = {
    tavilyResearchMs: 0,
    sourceFilteringMs: 0,
    evidenceExtractionMs: 0,
    normalizationMs: 0,
    verificationMs: 0,
    contentGenerationMs: 0,
    factGuardMs: 0,
    auditMs: 0,
    docxMs: 0,
    sanityPreviewMs: 0,
    totalMs: 0
  };

  const startTime = Date.now();

  const factGroupQueries = [
    { category: 'officialEntity', query: `${researchContext.schemeName} latest revised guidelines modification official site:gov.in` },
    { category: 'financialAssistance', query: `${researchContext.schemeName} enhanced maximum project cost subsidy contribution official site:gov.in` },
    { category: 'eligibility', query: `${researchContext.schemeName} education qualification eligibility age limit official site:gov.in` },
    { category: 'documents', query: `${researchContext.schemeName} documents required application process portal official` }
  ];

  let tavilyCalls = 0;
  let groqExtractionCalls = 0;
  let groqNormalizationCalls = 0;

  // 1. PARALLEL TAVILY RESEARCH
  const tavilyStartTime = Date.now();
  const searchPromises = factGroupQueries.map(async (group) => {
    try {
      tavilyCalls++;
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: group.query,
          search_depth: "advanced",
          include_answer: false,
          max_results: 3
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { category: group.category, results: data.results || [] };
    } catch (err) {
      logError(`Parallel Tavily search failed for query: ${group.query}`, err);
      return { category: group.category, results: [] };
    }
  });

  const searchResults = await Promise.allSettled(searchPromises);
  timingMetrics.tavilyResearchMs = Date.now() - tavilyStartTime;

  // 2. SOURCE FILTERING & COMPACT EVIDENCE EXTRACTION
  const sourceFilterStartTime = Date.now();
  const sources = [];
  const uniqueUrls = new Set();
  const compactEvidenceList = [];

  for (const res of searchResults) {
    if (res.status !== 'fulfilled') continue;
    const { category, results } = res.value;

    for (const result of results) {
      const auth = analyzeSourceAuthority(result.url, researchContext.schemeName, result.content);
      if (auth.authorityLevel !== 'invalid_url') {
        let sourceId = '';
        if (!uniqueUrls.has(result.url)) {
          uniqueUrls.add(result.url);
          sourceId = 'src_' + Math.random().toString(36).substring(2, 9);
          sources.push({
            id: sourceId,
            title: result.title || auth.domain,
            url: result.url,
            domain: auth.domain,
            sourceType: auth.authorityLevel,
            authorityLevel: auth.authorityLevel,
            authorityScore: auth.authorityScore,
            retrievedAt: new Date().toISOString()
          });
        } else {
          sourceId = sources.find(s => s.url === result.url).id;
        }

        if (auth.authorityScore >= 60) {
          compactEvidenceList.push({
            sourceId,
            title: result.title || auth.domain,
            category,
            evidence: (result.content || '').substring(0, 500)
          });
        }
      }
    }
  }
  timingMetrics.sourceFilteringMs = Date.now() - sourceFilterStartTime;
  timingMetrics.evidenceExtractionMs = 0; // Integrated compact extraction

  // 3. GROQ STRUCTURED NORMALIZATION
  const groqClient = getGroqClient();
  const fallbackModels = getResearchFallbackModels();

  const stageBInstruction = `
Normalize research evidence into JSON. Use ONLY supplied evidence. Set unsupported values to null and supportedBy to [].
EVIDENCE:
{{EVIDENCE}}
SOURCES:
{{SOURCES}}
Return exact JSON structure:
{
  "scheme": { "name": "", "status": null, "applicationPortalAvailable": false, "ministry": { "officialName": "", "verifiedAliases": [], "supportedBy": [] }, "implementingAgency": { "officialName": "", "verifiedAliases": [], "supportedBy": [] }, "officialWebsite": "", "sourceIds": [] },
  "financialAssistance": { "maxProjectCost": { "manufacturing": { "value": "", "supportedBy": [], "evidence": "" }, "service": { "value": "", "supportedBy": [], "evidence": "" } }, "subsidyStructure": [ { "beneficiaryCategory": "", "contribution": "", "urbanSubsidy": "", "ruralSubsidy": "", "supportedBy": [], "evidence": "" } ] },
  "eligibility": { "ageLimit": { "value": "", "supportedBy": [], "evidence": "" }, "educationRequirement": { "value": "", "supportedBy": [], "evidence": "" } },
  "documents": [],
  "applicationProcess": { "type": "", "steps": [], "sourceIds": [] },
  "importantDates": { "applicationDeadline": null },
  "sources": [ { "id": "", "title": "", "url": "", "domain": "", "sourceType": "", "authorityLevel": "", "authorityScore": 100, "retrievedAt": "" } ],
  "conflictLog": []
}
  `;

  async function performNormalization(compactEvidence) {
    const normStartTime = Date.now();
    const compactSources = sources.map(s => ({ id: s.id, title: s.title, url: s.url, domain: s.domain, authorityScore: s.authorityScore }));
    const stageBResponse = await withGroqRetry('Groq Normalization', fallbackModels, async (currentModel, attempt) => {
      groqNormalizationCalls++;
      const currentInstruction = stageBInstruction
        .replace('{{EVIDENCE}}', JSON.stringify(compactEvidence))
        .replace('{{SOURCES}}', JSON.stringify(compactSources));

      const config = {
        model: currentModel,
        messages: [
          { role: 'system', content: 'You are a data extraction agent. Output JSON only.' },
          { role: 'user', content: currentInstruction }
        ],
        temperature: 0.1,
        max_tokens: 3000
      };
      config.response_format = { type: "json_schema", json_schema: { name: researchSchema.name, schema: researchSchema.schema, strict: true } };

      return await groqClient.chat.completions.create(config);
    });

    const choice = stageBResponse.choices[0];
    const content = choice.message.content || choice.message.reasoning || '';
    if (!content.trim()) {
      throw new Error("Research normalization produced an empty response.");
    }
    const parsed = parseAIJson(content, 'normalization');
    if (!parsed.sources || parsed.sources.length === 0) {
      parsed.sources = sources.filter(s => s.authorityScore >= 60);
    }
    timingMetrics.normalizationMs += Date.now() - normStartTime;
    return parsed;
  }

  let parsedData = await performNormalization(compactEvidenceList);
  let coverage = calculateCriticalFactCoverage(parsedData);

  // 4. GAP-FILL ONLY WHEN REQUIRED (< 95%)
  if (coverage.coveragePercent < 95) {
    logWarning(`Preliminary coverage is ${coverage.coveragePercent}%. Running GAP FILL for missing fields:`, coverage.nullCriticalFields);

    let gapFillQueries = [];
    const fieldsStr = coverage.nullCriticalFields.join(' ');

    if (fieldsStr.includes('eligibility')) {
      gapFillQueries.push({ category: 'eligibility', query: `${researchContext.schemeName} eligibility criteria requirements official site:gov.in` });
    }
    if (fieldsStr.includes('documents') || fieldsStr.includes('application')) {
      gapFillQueries.push({ category: 'documents', query: `${researchContext.schemeName} documents required application apply online portal official` });
    }
    if (fieldsStr.includes('financialAssistance') || fieldsStr.includes('subsidy')) {
      gapFillQueries.push({ category: 'financialAssistance', query: `${researchContext.schemeName} subsidy details financial assistance limit official` });
    }

    gapFillQueries = gapFillQueries.slice(0, 2);

    if (gapFillQueries.length === 0) {
      gapFillQueries.push({ category: 'general', query: `${researchContext.schemeName} official details guidelines site:gov.in` });
    }

    // Parallel gap-fill queries
    const gapPromises = gapFillQueries.map(async (group) => {
      try {
        tavilyCalls++;
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, query: group.query, search_depth: "advanced", include_answer: false, max_results: 3 }),
          signal: AbortSignal.timeout(12000)
        });
        if (response.ok) {
          const data = await response.json();
          return { category: group.category, results: data.results || [] };
        }
      } catch (err) {}
      return { category: group.category, results: [] };
    });

    const gapResults = await Promise.allSettled(gapPromises);

    for (const res of gapResults) {
      if (res.status !== 'fulfilled') continue;
      const { category, results } = res.value;

      for (const result of results) {
        const auth = analyzeSourceAuthority(result.url, researchContext.schemeName, result.content);
        if (auth.authorityLevel !== 'invalid_url') {
          let sourceId = '';
          if (!uniqueUrls.has(result.url)) {
            uniqueUrls.add(result.url);
            sourceId = 'src_' + Math.random().toString(36).substring(2, 9);
            sources.push({
              id: sourceId,
              title: result.title || auth.domain,
              url: result.url,
              domain: auth.domain,
              sourceType: auth.authorityLevel,
              authorityLevel: auth.authorityLevel,
              authorityScore: auth.authorityScore,
              retrievedAt: new Date().toISOString()
            });
          } else {
            sourceId = sources.find(s => s.url === result.url).id;
          }

          if (auth.authorityScore >= 60) {
            compactEvidenceList.push({
              sourceId,
              title: result.title || auth.domain,
              category,
              evidence: (result.content || '').substring(0, 500)
            });
          }
        }
      }
    }

    parsedData = await performNormalization(compactEvidenceList);
    coverage = calculateCriticalFactCoverage(parsedData);
    logInfo(`Coverage after GAP FILL: ${coverage.coveragePercent}%`);
  }

  parsedData.preliminaryCriticalFactCoverage = coverage;
  parsedData.provider = 'tavily_groq';
  parsedData.mode = 'free_live_test';
  parsedData.liveModelCalls = true;
  parsedData.liveWebResearch = true;
  parsedData.researchId = 'res_' + Math.random().toString(36).substring(2, 10);

  let officialFound = sources.filter(s => s.authorityScore >= 95).length;
  let secondaryFound = sources.filter(s => s.authorityScore < 95 && s.authorityScore >= 60).length;
  let rejected = sources.filter(s => s.authorityScore < 60).length;

  parsedData.stats = {
    officialSourcesFound: officialFound,
    secondarySourcesFound: secondaryFound,
    sourcesRejected: rejected,
    conflictsFound: 0,
    conflictsResolved: 0,
    needsHumanReview: [],
    tavilyCalls,
    groqExtractionCalls,
    groqNormalizationCalls,
    groqBrowserSearchCalls: 0
  };

  timingMetrics.totalMs = Date.now() - startTime;
  parsedData.timingMetrics = timingMetrics;

  logInfo('Tavily & Groq Structured Normalization completed', { researchId: parsedData.researchId });
  return parsedData;
}

module.exports = {
  runTavilyLiveWebResearch
};
