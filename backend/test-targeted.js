require('dotenv').config({ path: './.env' });
const fs = require('fs');
const { getGroqClient } = require('./src/config/groq');
const { getTavilyApiKey } = require('./src/config/tavily');
const { researchSchema } = require('./src/utils/researchSchema');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');
const { parseAIJson } = require('./src/utils/parseAIJson');

async function test() {
  const masterResearch = JSON.parse(fs.readFileSync('./data/research-cache/nidhi-prayas-scheme-2026.master-research.json', 'utf8'));
  
  const sources = masterResearch.sources || [];
  let uniqueUrls = new Set(sources.map(s => s.url));

  const gapFillQueries = [
    'NIDHI PRAYAS implementing agency DST official site:gov.in',
    'NIDHI PRAYAS grant prototype support amount 10 lakh official site:gov.in'
  ];

  let tavilyCalls = 0;
  let groqCalls = 0;
  
  let compactEvidenceList = [];

  const apiKey = getTavilyApiKey();
  for (const q of gapFillQueries) {
    try {
      tavilyCalls++;
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query: q, search_depth: 'advanced', include_answer: false, max_results: 3 })
      });
      if (res.ok) {
        const data = await res.json();
        for (const result of data.results || []) {
          if (!uniqueUrls.has(result.url)) {
            uniqueUrls.add(result.url);
            const sourceId = 'src_' + Math.random().toString(36).substring(2, 9);
            sources.push({
              id: sourceId,
              title: result.title,
              url: result.url,
              domain: new URL(result.url).hostname,
              authorityScore: result.url.includes('gov.in') ? 100 : 70
            });
            compactEvidenceList.push({ sourceId, evidence: result.content.substring(0, 500) });
          } else {
            const sourceId = sources.find(s => s.url === result.url).id;
            compactEvidenceList.push({ sourceId, evidence: result.content.substring(0, 500) });
          }
        }
      }
    } catch(e) {}
  }

  const stageBInstruction = `
You are a structured normalization agent.
Update the EXISTING JSON based ONLY on the NEW EVIDENCE. 
If the new evidence answers the missing fields (implementingAgency, grantAmount, ageLimit, educationRequirement), add them with their sourceIds.
For Age and Education: If official rules clearly indicate no such requirement, set value to 'Not applicable'.
Do not change facts that are already supported, unless the new evidence explicitly contradicts them.
NULL IS NOT "SUPPORTED". If a value is null, its "supportedBy" array MUST be empty.

NEW EVIDENCE:
${JSON.stringify(compactEvidenceList, null, 2)}

EXISTING JSON:
${JSON.stringify(masterResearch, null, 2)}

SOURCES:
${JSON.stringify(sources, null, 2)}

PROPERTIES SCHEMA:
${JSON.stringify(researchSchema.schema.properties, null, 2)}
  `;

  const groqClient = getGroqClient();
  let currentModel = 'llama-3.1-8b-instant';
  groqCalls++;
  
  const config = {
    model: currentModel,
    messages: [
      { role: 'system', content: 'You are a data extraction agent. Output JSON only.' },
      { role: 'user', content: stageBInstruction }
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_schema', json_schema: { name: researchSchema.name, schema: researchSchema.schema, strict: true } }
  };

  const response = await groqClient.chat.completions.create(config);
  let parsed = parseAIJson(response.choices[0].message.content);
  parsed.sources = sources;

  const enforceSupportedBy = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(k => {
      if (obj[k] && typeof obj[k] === 'object' && 'supportedBy' in obj[k]) {
        if ('value' in obj[k] && obj[k].value && (!Array.isArray(obj[k].supportedBy) || obj[k].supportedBy.length === 0)) {
          obj[k].value = null; 
        }
        if ('officialName' in obj[k] && obj[k].officialName && (!Array.isArray(obj[k].supportedBy) || obj[k].supportedBy.length === 0)) {
          obj[k].officialName = null; 
        }
      }
      if (obj[k] && typeof obj[k] === 'object') {
        enforceSupportedBy(obj[k]);
      }
    });
  };
  enforceSupportedBy(parsed);

  const coverage = calculateCriticalFactCoverage(parsed);
  
  const missingMandatory = coverage.nullCriticalFields.filter(f => ['scheme.implementingAgency', 'financialAssistance.grantAmount'].includes(f));
  const publishReadiness = (coverage.coveragePercent >= 95 && missingMandatory.length === 0) ? 'ready' : 'needs_review / blocked';

  console.log('Supported critical facts:', coverage.supportedApplicable);
  console.log('Unresolved critical facts:', coverage.unresolvedApplicable);
  console.log('Not applicable facts:', coverage.notApplicable);
  console.log('');
  console.log('Implementing Agency:', parsed.scheme?.implementingAgency?.officialName || null);
  console.log('supportedBy:', parsed.scheme?.implementingAgency?.supportedBy || []);
  console.log('');
  console.log('Grant Amount:', parsed.financialAssistance?.grantAmount?.value || parsed.financialAssistance?.prototypeSupport?.value || null);
  console.log('supportedBy:', parsed.financialAssistance?.grantAmount?.supportedBy || parsed.financialAssistance?.prototypeSupport?.supportedBy || []);
  console.log('');
  console.log('Age requirement state:', coverage.nullCriticalFields.includes('eligibility.ageLimit') ? 'UNRESOLVED' : (coverage.notApplicableFields.includes('eligibility.ageLimit') ? 'NOT_APPLICABLE' : 'SUPPORTED'));
  console.log('Age value:', parsed.eligibility?.ageLimit?.value || null);
  console.log('supportedBy:', parsed.eligibility?.ageLimit?.supportedBy || []);
  console.log('');
  console.log('Education requirement state:', coverage.nullCriticalFields.includes('eligibility.educationRequirement') ? 'UNRESOLVED' : (coverage.notApplicableFields.includes('eligibility.educationRequirement') ? 'NOT_APPLICABLE' : 'SUPPORTED'));
  console.log('Education value:', parsed.eligibility?.educationRequirement?.value || null);
  console.log('supportedBy:', parsed.eligibility?.educationRequirement?.supportedBy || []);
  console.log('');
  console.log('CriticalFactCoverage:', coverage.coveragePercent + '%');
  console.log('Mandatory unresolved facts:', missingMandatory.length > 0 ? missingMandatory.join(', ') : 'None');
  console.log('publishReadiness:', publishReadiness);
  console.log('');
  console.log('Tavily queries used:', tavilyCalls);
  console.log('Groq calls used:', groqCalls);
}
test().catch(console.error);
