let sanityClient = null;

function isSanityConfigured() {
  return !!process.env.SANITY_PROJECT_ID && 
         !!process.env.SANITY_DATASET && 
         !!process.env.SANITY_API_TOKEN && 
         !!process.env.SANITY_API_VERSION;
}

function isSanityWriteEnabled() {
  return String(process.env.SANITY_WRITE_ENABLED).toLowerCase() === "true";
}

function isSanityDocumentTypeConfigured() {
  return !!process.env.SANITY_DOCUMENT_TYPE;
}

function getSanityStudioUrl() {
  return process.env.SANITY_STUDIO_URL?.trim() || null;
}

function getSanityDocumentType() {
  return process.env.SANITY_DOCUMENT_TYPE;
}

function getSanityClient() {
  if (!isSanityConfigured()) {
    throw new Error('Sanity is not configured. Missing required credentials.');
  }

  if (!sanityClient) {
    const { createClient } = require('@sanity/client');
    sanityClient = createClient({
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
      apiVersion: process.env.SANITY_API_VERSION,
      token: process.env.SANITY_API_TOKEN,
      useCdn: false, // Must be false for writes
    });
  }

  return sanityClient;
}

module.exports = {
  isSanityConfigured,
  isSanityWriteEnabled,
  isSanityDocumentTypeConfigured,
  getSanityStudioUrl,
  getSanityDocumentType,
  getSanityClient,
};
