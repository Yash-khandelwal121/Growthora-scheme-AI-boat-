const { getGroqClient, getResearchFallbackModels, isGroqConfigured } = require('../config/groq');
const { logInfo, logError, logWarning } = require('../utils/logger');
const { analyzeSourceAuthority } = require('../utils/sourceAuthority');
const { withGroqRetry } = require('../utils/groqRetry');
const { parseAIJson } = require('../utils/parseAIJson');
const { researchSchema } = require('../utils/researchSchema');

async function runGroqLiveWebResearch(researchContext) {
  if (!isGroqConfigured()) {
    throw new Error('Groq is not configured');
  }

  const groqClient = getGroqClient();
  const fallbackModels = getResearchFallbackModels();

  logInfo('Starting Groq Live Web Research (Stage A)', { schemeName: researchContext.schemeName });

  const factGroupQueries = [
    `Identity: official scheme name, ministry, implementing agency, official portal for ${researchContext.schemeName}`,
    `Financial Assistance: manufacturing project cost, service project cost, beneficiary contribution, subsidy rates (urban/rural, general/special) for ${researchContext.schemeName}`,
    `Eligibility: minimum age, income ceiling, education qualification, PDF guidelines for ${researchContext.schemeName}`
  ];

  let aggregatedEvidence = '';
  let allFoundUrls = [];

  // STAGE A: WEB EVIDENCE COLLECTION (Multiple Queries)
  for (let i = 0; i < factGroupQueries.length; i++) {
    const query = factGroupQueries[i];
    const searchQueryInstruction = `
You are an expert government scheme researcher.
Search for: ${query}
Prioritize official portals, ministry sites, and official PDF guidelines.
Use your browser_search tool to find accurate and up-to-date information.
Do NOT output structured JSON. Just return the factual evidence and cite the URLs you found.
    `;

    const stageAResponse = await withGroqRetry(`Groq Web Research (Stage A - Query ${i+1})`, fallbackModels, async (currentModel, attempt) => {
      return await groqClient.chat.completions.create({
        model: currentModel,
        messages: [
          { role: 'system', content: 'You are an evidence collection agent with browser access. Find facts and return them clearly.' },
          { role: 'user', content: searchQueryInstruction }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "browser_search",
              description: "Search the web",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string" }
                }
              }
            }
          }
        ],
        tool_choice: "auto",
        temperature: 0.1,
        max_tokens: 2000
      });
    });

    const rawEvidence = stageAResponse.choices[0].message.content || stageAResponse.choices[0].message.reasoning || '';
    aggregatedEvidence += `\n--- Evidence from Query ${i+1} ---\n${rawEvidence}\n`;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const foundUrls = rawEvidence.match(urlRegex) || [];
    allFoundUrls.push(...foundUrls);
  }
  
  const uniqueUrls = [...new Set(allFoundUrls)];
  const sources = [];
  
  uniqueUrls.forEach(urlStr => {
    let cleanUrl = urlStr.replace(/[)"\].,]+$/, '');
    const auth = analyzeSourceAuthority(cleanUrl, researchContext.schemeName, aggregatedEvidence);
    if (auth.authorityLevel !== 'invalid_url') {
      sources.push({
        id: 'src_' + Math.random().toString(36).substring(2, 9),
        title: auth.domain,
        url: cleanUrl,
        domain: auth.domain,
        sourceType: auth.authorityLevel,
        authorityLevel: auth.authorityLevel,
        authorityScore: auth.authorityScore,
        retrievedAt: new Date().toISOString()
      });
    }
  });

  logInfo('Starting Groq Structured Normalization (Stage B)', { schemeName: researchContext.schemeName });

  const stageBInstruction = `
You are a structured normalization agent.
You must use ONLY the supplied web evidence to create factual scheme fields.
Do not supplement government-scheme facts from model memory.
If a value is not found in the evidence, set the "value" to null.
NULL IS NOT "SUPPORTED". If a value is null, its "supportedBy" array MUST be empty.
When a PDF or guideline with tables is present, preserve structured relationships (e.g., subsidy arrays).

RAW WEB EVIDENCE:
${aggregatedEvidence}

DISCOVERED SOURCES (Use these IDs for citations):
${JSON.stringify(sources, null, 2)}

Produce a JSON object matching the MASTER_SCHEME_RESEARCH_JSON structure. 
CRITICAL SOURCE RULE: You MUST provide "supportedBy" arrays containing source IDs for every extracted fact.
Do not invent URLs. Only use provided source IDs.

EXPECTED JSON STRUCTURE:
{
  "scheme": { 
    "name": "...", 
    "status": "...", 
    "applicationPortalAvailable": true/false,
    "ministry": { "officialName": "...", "verifiedAliases": [], "supportedBy": [] }, 
    "implementingAgency": { "officialName": "...", "verifiedAliases": [], "supportedBy": [] }, 
    "officialWebsite": "...",
    "sourceIds": []
  },
  "financialAssistance": { 
    "maxProjectCost": { 
      "manufacturing": { "value": "...", "supportedBy": [] }, 
      "service": { "value": "...", "supportedBy": [] }
    },
    "subsidyStructure": [
      {
        "beneficiaryCategory": "...",
        "contribution": "...",
        "urbanSubsidy": "...",
        "ruralSubsidy": "...",
        "supportedBy": []
      }
    ]
  },
  "eligibility": { 
    "ageLimit": { "value": "...", "supportedBy": [] }, 
    "educationRequirement": { "value": "...", "supportedBy": [] }
  },
  "documents": ["..."],
  "applicationProcess": { "type": "...", "steps": ["..."], "sourceIds": [] },
  "importantDates": { "applicationDeadline": "..." },
  "sources": []
}
Ensure the "sources" array contains the sources with their titles and URLs strictly from the provided list.
  `;

  // STAGE B: STRUCTURED NORMALIZATION
  const stageBResponse = await withGroqRetry('Groq Normalization (Stage B)', fallbackModels, async (currentModel, attempt) => {
    const config = {
      model: currentModel,
      messages: [
        { role: 'system', content: 'You are a strict data extraction and normalization agent. Output JSON only.' },
        { role: 'user', content: stageBInstruction }
      ],
      temperature: 0.1,
      max_tokens: 4000
    };
    
    if (attempt === 0) {
      config.response_format = { type: "json_schema", json_schema: { name: researchSchema.name, schema: researchSchema.schema, strict: true } };
    }
    
    return await groqClient.chat.completions.create(config);
  });

  const normalizedContent = stageBResponse.choices[0].message.content || stageBResponse.choices[0].message.reasoning || '';
  const parsedData = parseAIJson(normalizedContent);
  
  // Inject the actual sources if the model messed them up
  if (!parsedData.sources || parsedData.sources.length === 0) {
    parsedData.sources = sources;
  }
  
  // Attach metadata
  parsedData.provider = 'groq';
  parsedData.mode = 'free_live_test';
  parsedData.liveModelCalls = true;
  parsedData.liveWebResearch = true;
  parsedData.researchId = 'res_' + Math.random().toString(36).substring(2, 10);
  
  let officialFound = sources.filter(s => s.authorityScore >= 95).length;
  let secondaryFound = sources.filter(s => s.authorityScore < 95 && s.authorityScore >= 60).length;
  let rejected = uniqueUrls.length - sources.length;
  
  parsedData.stats = {
    officialSourcesFound: officialFound,
    secondarySourcesFound: secondaryFound,
    sourcesRejected: rejected,
    conflictsFound: 0,
    conflictsResolved: 0,
    needsHumanReview: parsedData.importantDates?.applicationDeadline ? [] : ["Application deadline unverified"]
  };
  
  // Check for fake URLs
  parsedData.sources.forEach(s => {
    if (s.url && s.url.includes('example.gov.in')) {
      s.url = null;
      parsedData.stats.needsHumanReview.push("Removed fake example.gov.in URL");
    }
  });
  
  logInfo('Groq Structured Normalization completed', { researchId: parsedData.researchId });
  
  return parsedData;
}

module.exports = {
  runGroqLiveWebResearch
};
