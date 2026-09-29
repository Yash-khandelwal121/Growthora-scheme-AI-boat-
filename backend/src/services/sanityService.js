const sanityConfig = require('../config/sanity');
const { mapToSanityPayload } = require('../utils/sanityMapper');
const { logInfo, logError } = require('../utils/logger');

async function validateAndMap(finalArticleJson, categoryId = null) {
  const documentType = sanityConfig.getSanityDocumentType();
  if (!documentType) {
    throw new Error('Sanity document type is not configured (SANITY_DOCUMENT_TYPE is missing).');
  }

  if (!finalArticleJson || !finalArticleJson.article) {
    throw new Error('Invalid article data provided.');
  }

  // Safety checks for LIVE
  const isMock = finalArticleJson.mode === 'mock';
  const auditPassed = finalArticleJson.audit && finalArticleJson.audit.passed === true;
  const hasCriticalReviews = finalArticleJson.humanReview && finalArticleJson.humanReview.length > 0; // Simple heuristic

  const options = { categoryId };
  
  const { payload, omittedInternalFields } = mapToSanityPayload(finalArticleJson, documentType, options);
  
  // Mapping summary counts
  const mappingSummary = {
    detailedDescriptionBlocks: Array.isArray(payload.detailedDescription) ? payload.detailedDescription.length : 0,
    benefitsBlocks: Array.isArray(payload.benefits) ? payload.benefits.length : 0,
    eligibilityBlocks: Array.isArray(payload.eligibility) ? payload.eligibility.length : 0,
    documentsRequiredBlocks: Array.isArray(payload.documentsRequired) ? payload.documentsRequired.length : 0,
    faqCount: Array.isArray(payload.faqs) ? payload.faqs.length : 0,
    categoryStatus: categoryId ? 'configured' : 'missing'
  };

  return {
    payload,
    isMock,
    auditPassed,
    hasCriticalReviews,
    omittedInternalFields,
    mappingSummary
  };
}

async function previewDraft(finalArticleJson, categoryId = null) {
  const result = await validateAndMap(finalArticleJson, categoryId);
  return {
    payload: result.payload,
    omittedInternalFields: result.omittedInternalFields,
    mappingSummary: result.mappingSummary
  };
}

async function pushDraftToSanity(finalArticleJson, categoryId = null) {
  if (!sanityConfig.isSanityWriteEnabled()) {
    throw new Error('SANITY_WRITE_ENABLED is false. Cannot write to Sanity.');
  }
  
  if (!categoryId) {
    throw new Error('A category must be selected before pushing to Sanity.');
  }

  const { payload, isMock, auditPassed, hasCriticalReviews } = await validateAndMap(finalArticleJson, categoryId);

  if (isMock) {
    throw new Error('Mock content cannot be written to Sanity.');
  }
  if (!auditPassed) {
    throw new Error('Content audit failed. Sanity draft was not created.');
  }
  if (hasCriticalReviews) {
    throw new Error('Content has human review flags. Sanity draft was not created.');
  }

  try {
    const client = sanityConfig.getSanityClient();
    
    logInfo('Pushing draft to Sanity', { draftId: payload._id });
    const response = await client.createOrReplace(payload);
    
    return {
      documentId: response._id,
      draftId: response._id,
      operation: 'updated'
    };
  } catch (error) {
    logError('Sanity push failed', error);
    throw new Error('Failed to push draft to Sanity: ' + error.message);
  }
}

async function getCategories() {
  const client = sanityConfig.getSanityClient();
  const categories = await client.fetch(`*[_type == "schemeCategory"]{_id, title, slug}`);
  return categories.map(c => ({
    _id: c._id,
    name: c.title,
    slug: c.slug?.current || ''
  }));
}

module.exports = {
  previewDraft,
  pushDraftToSanity,
  getCategories
};
