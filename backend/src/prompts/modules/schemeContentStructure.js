const schemeContentStructure = `
==================================================
ARTICLE STRUCTURE & CONTENT OUTPUT JSON
==================================================
Generate the content as a JSON object strictly following this structure. Keep existing property names where appropriate to preserve compatibility.

{
  "searchIntent": "informational, eligibility, how-to, financial assistance, application, documents, or mixed intent",
  "primaryUserQuestion": "String",
  "secondaryUserQuestions": ["String", "String"],
  "seo": {
    "metaTitle": "String (complete readable title under 60 chars, e.g. '[Scheme Name] 2026: Eligibility, Benefits & Application')",
    "metaDescription": "String (approx 150 chars, clear summary specifying key assistance limits, eligibility, and process based on verified research)",
    "slug": "String (lowercase with hyphens, generated dynamically from primary keyword, e.g. mudra-loan-scheme-2026)",
    "canonicalPath": "String (e.g. https://growthora.co.in/govtschemes/<slug>)",
    "primaryKeyword": "String",
    "secondaryKeywords": ["String"]
  },
  "article": {
    "h1": "String",
    "snippetAnswer": "String (Hero Short Description: 40-70 words clearly stating what the scheme is, financial/credit limits, key eligibility criteria, and application portal based strictly on research).",
    "detailedDescription": {
      "introduction": "String",
      "schemeAtAGlance": { "Key": "Value" },
      "whatIsScheme": "String",
      "objectives": "String"
    },
    "keyBenefits": [{ "title": "String", "description": "String" }],
    "financialAssistance": [{ "detail": "String" }],
    "eligibility": [{ "category": "String", "criteria": "String" }],
    "documentsRequired": [{ "document": "String", "purpose": "String", "requirementStatus": "String" }],
    "applicationProcess": ["String"],
    "importantDates": [{ "event": "String", "date": "String" }],
    "mistakesToAvoid": ["String"],
    "limitations": ["String"],
    "conclusion": "String (80-150 words. Finish with: 'For assistance with eligibility assessment, documentation or scheme application planning, you can consult Growthora.')",
    "faqs": [{ "question": "String", "answer": "String" }]
  },
  "internalLinkRecommendations": [{ "anchorText": "String", "targetTopic": "String", "reason": "String" }],
  "externalSourceRecommendations": [{ "title": "String", "url": "String", "reason": "String" }],
  "humanReview": ["String"],
  "issuesRequiringVerification": ["String"]
}

STRICT FACTUAL & FORM MAPPING RULES:
1. FINANCIAL & CREDIT STRUCTURE:
   - Reflect the scheme type dynamically:
     * For LOAN/CREDIT schemes: detail loan categories (e.g., Shishu, Kishore, Tarun, Tarun Plus), credit limits, collateral requirements, and lending institutions.
     * For SUBSIDY/GRANT schemes: detail maximum project cost limits, subsidy percentages (general vs special), and beneficiary contributions.
     * For EQUITY/FUNDING schemes: detail investment caps and equity terms.
2. AGENCIES & MINISTRY:
   - Extract administering ministry/department, nodal agency, or participating lending institutions dynamically from verified research. Never hardcode or assume a specific ministry or agency.
3. BENEFITS, ELIGIBILITY & DOCUMENTS:
   - Provide EXACTLY 5 distinct keyBenefits, 5 distinct eligibility criteria, and 5 distinct documentsRequired items supported by research. Never fabricate placeholders or duplicate generic strings.
4. FAQs:
   - Provide EXACTLY 15 accurate FAQs based on verified research.
5. SLUG & CANONICAL:
   - Always generate a dynamic SEO slug based on the current scheme name / primary keyword. Use this exact same slug for seo.slug and seo.canonicalPath (https://growthora.co.in/govtschemes/<slug>).
`;

module.exports = { schemeContentStructure };
