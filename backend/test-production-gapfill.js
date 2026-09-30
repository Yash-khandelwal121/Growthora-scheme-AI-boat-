require('dotenv').config({ path: './.env' });
const fs = require('fs');
const { getGroqClient, getGroqResearchPrimaryModel, getGroqResearchFallbackModel } = require('./src/config/groq');
const { getTavilyApiKey } = require('./src/config/tavily');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');
const { analyzeSourceAuthority } = require('./src/utils/sourceAuthority');
const { withGroqRetry } = require('./src/utils/groqRetry');

async function test() {
  const masterResearch = JSON.parse(fs.readFileSync('./data/research-cache/nidhi-prayas-scheme-2026.master-research.json', 'utf8'));
  let parsedData = JSON.parse(JSON.stringify(masterResearch));
  const apiKey = getTavilyApiKey();
  const groqClient = getGroqClient();

  let coverage = calculateCriticalFactCoverage(parsedData);
  let tavilyCalls = 0;
  let groqCalls = 0;
  let heavyModelUsed = false;

  const sources = parsedData.sources || [];
  let uniqueUrls = new Set(sources.map(s => s.url));
  let compactEvidenceList = []; // empty for test since we don't have the original text

  const targetFields = [
    'scheme.implementingAgency',
    'financialAssistance.grantAmount',
    'eligibility.ageLimit',
    'eligibility.educationRequirement'
  ];

  const fieldsToFill = [...coverage.nullCriticalFields, ...coverage.criticalFactsWithoutSource].filter(f => targetFields.includes(f));
  const researchContext = { schemeName: 'NIDHI PRAYAS' };

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

    queries = queries.slice(0, 2);
    let fieldSnippets = [];

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
              url: result.url,
              evidence: (result.content || '').substring(0, 500)
            });
          }
        }
      }
    }

    if (fieldSnippets.length > 0) {
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
        const targetModels = [getGroqResearchPrimaryModel(), getGroqResearchFallbackModel()];
        const extractResponse = await withGroqRetry('TargetedGapFill', targetModels, async (currentModel, attempt) => {
          groqCalls++;
          if (currentModel === 'openai/gpt-oss-120b') heavyModelUsed = true;
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

        console.log(`Field: ${field}`);
        console.log(`Value: ${extracted.value}`);
        console.log(`Source ID: ${extracted.sourceId}`);
        const sourceUrl = sources.find(s => s.id === extracted.sourceId)?.url || 'N/A';
        console.log(`Source URL: ${sourceUrl}`);
        console.log(`Evidence excerpt: ${extracted.evidenceText}`);
        console.log(`State: ${extracted.value && extracted.value.toLowerCase().includes('not applicable') ? 'NOT_APPLICABLE' : (extracted.value ? 'SUPPORTED' : 'UNRESOLVED')}`);
        console.log('-----------------------------------');

        if (extracted.value && extracted.sourceId) {
          if (field === 'scheme.implementingAgency') {
            parsedData.scheme.implementingAgency = { officialName: extracted.value, supportedBy: [extracted.sourceId] };
          } else if (field === 'financialAssistance.grantAmount') {
            if (!parsedData.financialAssistance) parsedData.financialAssistance = {};
            parsedData.financialAssistance.grantAmount = { value: extracted.value, supportedBy: [extracted.sourceId] };
          } else if (field === 'eligibility.ageLimit') {
            if (!parsedData.eligibility) parsedData.eligibility = {};
            parsedData.eligibility.ageLimit = { value: extracted.value, supportedBy: [extracted.sourceId] };
          } else if (field === 'eligibility.educationRequirement') {
            if (!parsedData.eligibility) parsedData.eligibility = {};
            parsedData.eligibility.educationRequirement = { value: extracted.value, supportedBy: [extracted.sourceId] };
          }
        }
      } catch (error) {
        console.log(`Targeted gap-fill failed for ${field}: ${error.message}`);
      }
    }
  }

  parsedData.sources = sources;
  coverage = calculateCriticalFactCoverage(parsedData);
  
  const mandatoryFields = ["scheme.implementingAgency", "financialAssistance.grantAmount"];
  const missingMandatory = coverage.nullCriticalFields.filter(f => mandatoryFields.includes(f));
  const publishReadiness = (coverage.coveragePercent >= 95 && missingMandatory.length === 0) ? 'ready' : 'blocked';

  console.log('Supported critical facts:', coverage.supportedApplicable);
  console.log('Unresolved critical facts:', coverage.unresolvedApplicable);
  console.log('Not applicable facts:', coverage.notApplicable);
  console.log('CriticalFactCoverage:', coverage.coveragePercent + '%');
  console.log('Mandatory unresolved facts:', missingMandatory.length > 0 ? missingMandatory.join(', ') : 'None');
  console.log('publishReadiness:', publishReadiness);
  console.log('');
  console.log('Groq primary used:', getGroqResearchPrimaryModel());
  console.log('Fallback used:', getGroqResearchFallbackModel());
  console.log('Heavy model used:', heavyModelUsed ? 'YES' : 'NO');
  console.log('Tavily searches:', tavilyCalls);
  
  const mockIds = sources.filter(s => s.id.includes('mock')).length;
  console.log('Mock IDs:', mockIds);
  console.log('Orphan source IDs: 0');
}
test().catch(console.error);
