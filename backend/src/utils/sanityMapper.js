const { 
  buildDetailedDescription, 
  buildBenefits, 
  buildEligibility, 
  buildDocumentsRequired, 
  buildFAQs 
} = require('./portableTextBuilder');
const mapping = require('../config/sanityFieldMapping');

function buildSeoKeywords(primary, secondary) {
  const keywords = [];
  if (primary && typeof primary === 'string') {
    keywords.push(primary.trim());
  }
  
  if (Array.isArray(secondary)) {
    secondary.forEach(k => {
      if (k && typeof k === 'string') {
        const trimmed = k.trim();
        // Check case-insensitive duplicates
        if (trimmed && !keywords.some(ex => ex.toLowerCase() === trimmed.toLowerCase())) {
          keywords.push(trimmed);
        }
      }
    });
  }
  
  return keywords.join(', ');
}

function mapToSanityPayload(finalArticleJson, documentType, options = {}) {
  const { mode, seo = {}, article = {}, sources = [], audit = {}, sourceResearchId } = finalArticleJson;
  const categoryId = options.categoryId;
  
  // Clean slug
  let cleanSlug = seo.slug || "";
  if (cleanSlug.startsWith('/blog/')) {
    cleanSlug = cleanSlug.replace('/blog/', '');
  } else if (cleanSlug.startsWith('/')) {
    cleanSlug = cleanSlug.substring(1);
  }

  // Base deterministic ID based on slug
  const cleanIdPart = cleanSlug.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  const baseId = `scheme-${cleanIdPart}`;

  const payload = {
    _id: `drafts.${baseId}`,
    _type: documentType,
  };

  // 1. name
  if (mapping.name) {
    let cleanName = finalArticleJson.researchSchemeName;
    if (!cleanName && article.schemeAtAGlance && article.schemeAtAGlance["Official Scheme Name"]) {
      cleanName = article.schemeAtAGlance["Official Scheme Name"];
    }
    payload[mapping.name] = cleanName || "Untitled Scheme";
  }
  
  // 2. slug
  if (mapping.slug) {
    payload[mapping.slug] = {
      _type: 'slug',
      current: cleanSlug
    };
  }

  // 3. shortDescription
  if (mapping.shortDescription) payload[mapping.shortDescription] = article.snippetAnswer || "";
  
  // 4. seoTitle
  if (mapping.seoTitle) {
    payload[mapping.seoTitle] = seo.metaTitle || article.h1 || "";
  }
  
  // 5. seoDescription
  if (mapping.seoDescription) payload[mapping.seoDescription] = seo.metaDescription || "";
  
  // 6. seoKeywords
  if (mapping.seoKeywords) {
    payload[mapping.seoKeywords] = buildSeoKeywords(seo.primaryKeyword, seo.secondaryKeywords);
  }

  // 7. category
  if (mapping.category && categoryId) {
    payload[mapping.category] = {
      _type: 'reference',
      _ref: categoryId
    };
  }
  
  // 8. detailedDescription
  if (mapping.detailedDescription) {
    payload[mapping.detailedDescription] = buildDetailedDescription(article);
  }
  
  // 9. benefits
  if (mapping.benefits) {
    payload[mapping.benefits] = buildBenefits(article.keyBenefits);
  }
  
  // 10. eligibility
  if (mapping.eligibility) {
    payload[mapping.eligibility] = buildEligibility(article.eligibility);
  }
  
  // 11. documentsRequired
  if (mapping.documentsRequired) {
    payload[mapping.documentsRequired] = buildDocumentsRequired(article.documentsRequired);
  }
  
  // 12. faqs
  if (mapping.faqs) {
    payload[mapping.faqs] = buildFAQs(article.faqs);
  }

  // Identify omitted internal fields
  const omittedInternalFields = [
    "schemaMarkup",
    "sourceResearchId",
    "researchSchemeName",
    "auditScore",
    "researchVerifiedAt",
    "generatedAt",
    "sources",
    "audit",
    "humanReview",
    "mode"
  ];

  return { payload, omittedInternalFields };
}

module.exports = {
  mapToSanityPayload,
  buildSeoKeywords
};
