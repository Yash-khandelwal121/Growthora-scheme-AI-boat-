const { getGroqClient, getContentFallbackModels, isGroqConfigured } = require('../config/groq');
const { contentWriterPrompt } = require('../prompts/contentWriterPrompt');
const { parseAIJson } = require('../utils/parseAIJson');
const { logInfo } = require('../utils/logger');
const { withGroqRetry } = require('../utils/groqRetry');

async function runGroqContentWriter(masterResearch) {
  if (!isGroqConfigured()) {
    throw new Error('Groq is not configured');
  }

  const groqClient = getGroqClient();
  const fallbackModels = getContentFallbackModels();

  // Build a compact research summary to preserve Groq daily token allowance
  const compactResearch = {
    researchId: masterResearch.researchId,
    scheme: masterResearch.scheme,
    financialAssistance: masterResearch.financialAssistance,
    eligibility: masterResearch.eligibility,
    documents: masterResearch.documents,
    applicationProcess: masterResearch.applicationProcess,
    conflictLog: masterResearch.conflictLog,
    sources: (masterResearch.sources || []).map(s => ({ title: s.title, url: s.url, domain: s.domain, authorityLevel: s.authorityLevel }))
  };

  const systemPrompt = contentWriterPrompt.replace('{{MASTER_RESEARCH_JSON}}', JSON.stringify(compactResearch, null, 2));

  return await withGroqRetry('Groq Content Writer', fallbackModels, async (currentModel, attempt) => {
    const requestConfig = {
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the SEO/AEO/GEO content as a JSON object based on the research. You MUST generate EXACTLY 5 distinct keyBenefits (e.g., subsidy, higher limits, employment), 5 distinct eligibility criteria (e.g., above 18, new enterprise, education if specified), 5 distinct documents (only those explicitly supported), EXACTLY 15 FAQs, and exactly 19 distinct secondary keywords. Use ONLY facts from the research. If 5 supported benefits or documents cannot be produced, do not fabricate them.' }
      ],
      temperature: 0.1,
      max_tokens: 6500,
    };
    if (attempt === 0) {
      requestConfig.response_format = { type: "json_object" };
    }
    const response = await groqClient.chat.completions.create(requestConfig);

    const finishReason = response.choices[0].finish_reason;
    if (finishReason === 'length') {
      throw new Error('LLM output truncated (finish_reason = length). Need to fallback or retry.');
    }

    const content = response.choices[0].message.content || response.choices[0].message.reasoning || '';
    
    // Attempt parse. parseAIJson handles some basic repair, but we will strictly validate.
    let parsedData;
    try {
      parsedData = parseAIJson(content);
    } catch (err) {
      throw new Error('Failed to parse AI JSON during normalization. Output might be truncated. ' + err.message);
    }
    
    // Strict schema check
    if (!parsedData || !parsedData.article) {
      throw new Error('Missing top-level article object in generated content.');
    }

    const art = parsedData.article;

    // 1. Safe Alias Normalization for keyBenefits
    if (!Array.isArray(art.keyBenefits) || art.keyBenefits.length === 0) {
      if (Array.isArray(art.benefits) && art.benefits.length > 0) art.keyBenefits = art.benefits;
      else if (art.benefits && Array.isArray(art.benefits.items)) art.keyBenefits = art.benefits.items;
      else if (Array.isArray(art.schemeBenefits) && art.schemeBenefits.length > 0) art.keyBenefits = art.schemeBenefits;
      else if (Array.isArray(art.advantages) && art.advantages.length > 0) art.keyBenefits = art.advantages;
      else if (Array.isArray(art.benefitPoints) && art.benefitPoints.length > 0) art.keyBenefits = art.benefitPoints;
    }

    // 2. Safe Alias Normalization for detailedDescription
    if (!art.detailedDescription) {
      if (art.detailed_description) art.detailedDescription = art.detailed_description;
      else if (art.articleBody) art.detailedDescription = art.articleBody;
      else if (art.mainContent) art.detailedDescription = art.mainContent;
      else if (art.description) art.detailedDescription = art.description;
    }

    // 3. Safe Alias Normalization for eligibility
    if (!Array.isArray(art.eligibility) || art.eligibility.length === 0) {
      if (art.eligibility && typeof art.eligibility === 'object') {
        if (Array.isArray(art.eligibility.criteria)) art.eligibility = art.eligibility.criteria;
        else if (Array.isArray(art.eligibility.details)) art.eligibility = art.eligibility.details;
        else if (Array.isArray(art.eligibility.items)) art.eligibility = art.eligibility.items;
        else if (Array.isArray(art.eligibility.points)) art.eligibility = art.eligibility.points;
      } else if (Array.isArray(art.eligibilityCriteria)) {
        art.eligibility = art.eligibilityCriteria;
      } else if (Array.isArray(art.eligibility_criteria)) {
        art.eligibility = art.eligibility_criteria;
      }
    }

    // 4. Safe Alias Normalization for documentsRequired
    if (!Array.isArray(art.documentsRequired) || art.documentsRequired.length === 0) {
      if (art.documentsRequired && typeof art.documentsRequired === 'object') {
        if (Array.isArray(art.documentsRequired.required)) art.documentsRequired = art.documentsRequired.required;
        else if (Array.isArray(art.documentsRequired.items)) art.documentsRequired = art.documentsRequired.items;
      } else if (art.documents && typeof art.documents === 'object') {
        if (Array.isArray(art.documents.required)) art.documentsRequired = art.documents.required;
        else if (Array.isArray(art.documents.items)) art.documentsRequired = art.documents.items;
      } else if (Array.isArray(art.documents)) {
        art.documentsRequired = art.documents;
      } else if (Array.isArray(art.documents_required)) {
        art.documentsRequired = art.documents_required;
      } else if (Array.isArray(art.requiredDocuments)) {
        art.documentsRequired = art.requiredDocuments;
      }
    }

    // 5. Safe Alias Normalization for faqs
    if (!Array.isArray(art.faqs) || art.faqs.length === 0) {
      if (Array.isArray(art.faq)) art.faqs = art.faq;
      else if (Array.isArray(art.questionsAndAnswers)) art.faqs = art.questionsAndAnswers;
      else if (Array.isArray(art.faqList)) art.faqs = art.faqList;
    }

    // 6. Safe Alias Normalization for conclusion
    if (!art.conclusion) {
      if (art.finalConclusion) art.conclusion = art.finalConclusion;
      else if (art.closingNote) art.conclusion = art.closingNote;
      else if (art.summary) art.conclusion = art.summary;
    }

    // 7. Safe Alias Normalization for shortDescription / snippetAnswer
    if (!art.shortDescription && !art.snippetAnswer) {
      if (art.heroDescription) art.shortDescription = art.heroDescription;
      else if (art.summaryAnswer) art.shortDescription = art.summaryAnswer;
    }
    if (!art.snippetAnswer && art.shortDescription) {
      art.snippetAnswer = art.shortDescription;
    }
    if (!art.shortDescription && art.snippetAnswer) {
      art.shortDescription = art.snippetAnswer;
    }

    const { snippetAnswer, detailedDescription, keyBenefits, eligibility, documentsRequired, faqs, conclusion } = art;
    
    if (!snippetAnswer) throw new Error('Missing shortDescription/snippetAnswer.');
    if (!detailedDescription) throw new Error('Missing detailedDescription.');
    if (!keyBenefits || !Array.isArray(keyBenefits) || keyBenefits.length === 0) throw new Error('Missing or empty keyBenefits array.');
    if (!eligibility || !Array.isArray(eligibility) || eligibility.length === 0) throw new Error('Missing or empty eligibility array.');
    if (!documentsRequired || !Array.isArray(documentsRequired) || documentsRequired.length === 0) throw new Error('Missing or empty documentsRequired array.');
    if (!faqs || !Array.isArray(faqs) || faqs.length === 0) throw new Error('Missing or empty faqs array.');
    if (!conclusion) throw new Error('Missing conclusion.');
    if (!parsedData.seo) throw new Error('Missing seo object.');
    if (!parsedData.seo.slug || !parsedData.seo.canonicalPath) throw new Error('Missing dynamic seo slug or canonicalPath.');

    if (parsedData.article) {
      parsedData.article.keyBenefits = art.keyBenefits;
      parsedData.article.benefits = art.keyBenefits;
      parsedData.article.eligibility = art.eligibility;
      parsedData.article.documentsRequired = art.documentsRequired;
      parsedData.article.faqs = art.faqs;
    }
    
    if (parsedData.seo) {
      // Assemble EXACTLY 20 keywords
      let allKws = [];
      if (parsedData.seo.primaryKeyword) allKws.push(parsedData.seo.primaryKeyword);
      if (Array.isArray(parsedData.seo.secondaryKeywords)) {
        allKws = allKws.concat(parsedData.seo.secondaryKeywords);
      }
      
      // Trim, remove empty, and deduplicate case-insensitively
      const uniqueMap = new Map();
      allKws.forEach(k => {
        if (!k) return;
        const trimmed = k.toString().trim();
        if (trimmed === "") return;
        
        // Remove placeholder patterns like "keyword 1", "scheme 2" but NOT 2026
        if (trimmed.match(/keyword \d+$/i)) return;
        if (trimmed.match(/scheme \d+$/i) && !trimmed.match(/20\d\d$/)) return;
        
        const lower = trimmed.toLowerCase();
        if (!uniqueMap.has(lower)) {
          uniqueMap.set(lower, trimmed);
        }
      });
      
      let finalKws = Array.from(uniqueMap.values());
      
      // If we need more, generate semantic ones
      const schemeName = masterResearch.scheme?.name || 'Government Scheme';
      const fallbacks = [
        `${schemeName} application`,
        `${schemeName} eligibility`,
        `${schemeName} subsidy`,
        `${schemeName} loan`,
        `${schemeName} documents`,
        `${schemeName} portal`,
        `${schemeName} apply online`,
        `${schemeName} guidelines`,
        `${schemeName} details`,
        `${schemeName} benefits`,
        `${schemeName} for micro enterprises`,
        `${schemeName} status`,
        `${schemeName} registration`,
        `${schemeName} form`,
        `${schemeName} update`,
        `${schemeName} MSME`,
        `${schemeName} amount limit`,
        `${schemeName} process`,
        `${schemeName} helpline`,
        `${schemeName} official portal`
      ];
      
      let fbIdx = 0;
      while (finalKws.length < 20 && fbIdx < fallbacks.length) {
        const candidate = fallbacks[fbIdx++];
        const lower = candidate.toLowerCase();
        if (!uniqueMap.has(lower)) {
          uniqueMap.set(lower, candidate);
          finalKws.push(candidate);
        }
      }
      
      // Truncate to exactly 20
      finalKws = finalKws.slice(0, 20);
      
      if (finalKws.length > 0) {
        parsedData.seo.primaryKeyword = finalKws[0];
        parsedData.seo.secondaryKeywords = finalKws.slice(1);
      }
    }
    
    logInfo('Groq Content Writer completed successfully');
    return parsedData;
  });
}

module.exports = {
  runGroqContentWriter
};
