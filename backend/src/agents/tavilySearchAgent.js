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

  // 4. TARGETED GAP-FILL ONLY FOR MISSING FIELDS
  if (coverage.coveragePercent < 95 || coverage.nullCriticalFields.length > 0 || coverage.criticalFactsWithoutSource.length > 0) {
    const allMissing = [...coverage.nullCriticalFields, ...coverage.criticalFactsWithoutSource];
    logWarning(`Preliminary coverage is ${coverage.coveragePercent}%. Running TARGETED GAP FILL for:`, allMissing);

    const targetFields = [
      'scheme.implementingAgency',
      'financialAssistance.grantAmount',
      'eligibility.ageLimit',
      'eligibility.educationRequirement'
    ];

    const fieldsToFill = allMissing.filter(f => targetFields.includes(f));

    for (const field of fieldsToFill) {
      let queries = [];
      if (field === 'scheme.implementingAgency') {
        queries.push(`${researchContext.schemeName} implementing agency nodal body official site:gov.in`);
        queries.push(`${researchContext.schemeName} who implements administers ministry site:gov.in`);
      } else if (field === 'financialAssistance.grantAmount') {
        queries.push(`${researchContext.schemeName} grant amount prototype support financial assistance limit site:gov.in`);
      } else if (field === 'eligibility.ageLimit') {
        queries.push(`${researchContext.schemeName} age limit requirement minimum maximum age site:gov.in`);
      } else if (field === 'eligibility.educationRequirement') {
        queries.push(`${researchContext.schemeName} education qualification requirement degree diploma site:gov.in`);
      }

      // Max 2 targeted searches
      queries = queries.slice(0, 2);

      let fieldSnippets = [];

      // Reuse existing snippets first
      for (const snippet of compactEvidenceList) {
        if (snippet.evidence.toLowerCase().includes(field.split('.').pop().toLowerCase())) {
          fieldSnippets.push(snippet);
        }
      }

      // Run new queries
      const gapPromises = queries.map(async (query) => {
        try {
          tavilyCalls++;
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, query: query, search_depth: "advanced", include_answer: false, max_results: 3 }),
            signal: AbortSignal.timeout(12000)
          });
          if (response.ok) {
            const data = await response.json();
            return data.results || [];
          }
        } catch (err) {}
        return [];
      });

      const gapResults = await Promise.allSettled(gapPromises);

      for (const res of gapResults) {
        if (res.status !== 'fulfilled') continue;
        for (const result of res.value) {
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
              fieldSnippets.push({
                sourceId,
                evidence: (result.content || '').substring(0, 500)
              });
            }
          }
        }
      }

      if (fieldSnippets.length > 0) {
        // Send ONLY these snippets to Groq to extract the specific field
        const snippetsContext = fieldSnippets.slice(0, 5).map(s => `[${s.sourceId}] ${s.evidence}`).join('\n\n');
        
        const extractPrompt = `
Extract the exact value for the field '${field}' from the following snippets.
Do NOT use outside knowledge. 
If the snippet explicitly states that this requirement does NOT exist (e.g., 'no age limit', 'any education'), return value as 'Not applicable'.
If there is no information about '${field}' in the snippets, return value as null.
You MUST return the sourceId exactly as it appears in brackets (e.g. src_abc123) next to the evidence you used.

Snippets:
${snippetsContext}
`;

        const extractionSchema = {
          name: "field_extraction",
          schema: {
            type: "object",
            properties: {
              value: { type: ["string", "null"] },
              sourceId: { type: ["string", "null"] },
              evidenceText: { type: ["string", "null"] },
              confidence: { type: "number" }
            },
            required: ["value", "sourceId", "evidenceText", "confidence"],
            additionalProperties: false
          }
        };

        try {
          // Use primary -> fallback, NO heavy model by default
          const targetModels = [getGroqResearchPrimaryModel(), getGroqResearchFallbackModel()];
          const extractResponse = await withGroqRetry('TargetedGapFill', targetModels, async (currentModel, attempt) => {
            groqExtractionCalls++;
            const config = {
              model: currentModel,
              messages: [
                { role: 'system', content: 'You extract specific data strictly from provided snippets. Output JSON only.' },
                { role: 'user', content: extractPrompt }
              ],
              temperature: 0.0,
              max_tokens: 500,
              response_format: { type: "json_schema", json_schema: { name: extractionSchema.name, schema: extractionSchema.schema, strict: true } }
            };
            return await groqClient.chat.completions.create(config);
          });

          const content = extractResponse.choices[0].message.content;
          const extracted = JSON.parse(content);

          if (extracted.value && extracted.sourceId) {
            // Apply it to parsedData
            if (field === 'scheme.implementingAgency') {
              if (!parsedData.scheme.implementingAgency) parsedData.scheme.implementingAgency = {};
              parsedData.scheme.implementingAgency.officialName = extracted.value;
              parsedData.scheme.implementingAgency.supportedBy = [extracted.sourceId];
            } else if (field === 'financialAssistance.grantAmount') {
              if (!parsedData.financialAssistance) parsedData.financialAssistance = {};
              if (parsedData.schemeType === 'GRANT') {
                if (!parsedData.financialAssistance.grantAmount) parsedData.financialAssistance.grantAmount = {};
                parsedData.financialAssistance.grantAmount.value = extracted.value;
                parsedData.financialAssistance.grantAmount.supportedBy = [extracted.sourceId];
              }
            } else if (field === 'eligibility.ageLimit') {
              if (!parsedData.eligibility) parsedData.eligibility = {};
              if (!parsedData.eligibility.ageLimit) parsedData.eligibility.ageLimit = {};
              parsedData.eligibility.ageLimit.value = extracted.value;
              parsedData.eligibility.ageLimit.supportedBy = [extracted.sourceId];
            } else if (field === 'eligibility.educationRequirement') {
              if (!parsedData.eligibility) parsedData.eligibility = {};
              if (!parsedData.eligibility.educationRequirement) parsedData.eligibility.educationRequirement = {};
              parsedData.eligibility.educationRequirement.value = extracted.value;
              parsedData.eligibility.educationRequirement.supportedBy = [extracted.sourceId];
            }
          }
        } catch (error) {
          logError(`Targeted gap-fill failed for ${field}`, error);
          if (error.message.includes('RATE_LIMITED') || error.message.includes('model_decommissioned') || error.message.includes('model_not_found') || error.message.includes('tokens')) {
            return {
              success: false,
              errorCategory: "provider_rate_limited",
              researchStatus: "needs_retry",
              message: "Groq API limits exhausted during gap-fill."
            };
          }
        }
      }
    }

    coverage = calculateCriticalFactCoverage(parsedData);
    logInfo(`Coverage after TARGETED GAP FILL: ${coverage.coveragePercent}%`);
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
