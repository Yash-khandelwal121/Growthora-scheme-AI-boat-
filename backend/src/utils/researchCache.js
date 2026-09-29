const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logInfo, logError } = require('./logger');

const CACHE_DIR = path.join(__dirname, '../../data/research-cache');

function getCacheFilePath(slug) {
  return path.join(CACHE_DIR, `${slug}.master-research.json`);
}

function computeFingerprint(schemeName, primaryKeyword) {
  const norm = `${(schemeName || '').toLowerCase().trim()}_${(primaryKeyword || '').toLowerCase().trim()}`;
  return crypto.createHash('md5').update(norm).digest('hex');
}

function saveResearchCache(slug, researchData, inputContext = {}) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const sources = researchData.sources || [];
    const latestRetrieved = sources.map(s => s.retrievedAt).filter(Boolean).sort().pop() || new Date().toISOString();

    const safeData = {
      ...researchData,
      schemeSlug: slug,
      slug,
      generatedAt: researchData.generatedAt || new Date().toISOString(),
      sourceFreshness: latestRetrieved,
      researchFingerprint: computeFingerprint(inputContext.schemeName || researchData.scheme?.name, inputContext.primaryKeyword || slug)
    };
    fs.writeFileSync(getCacheFilePath(slug), JSON.stringify(safeData, null, 2));
    logInfo('Saved research to cache', { slug });
    return safeData;
  } catch (error) {
    logError('Failed to save research cache', error);
  }
}

function loadResearchCache(slug, inputContext = null) {
  try {
    const filePath = getCacheFilePath(slug);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // CACHE SAFETY: validate scheme/slug match and required structure
    if (data.slug !== slug && data.schemeSlug !== slug) {
      logError('Cache validation failed: Slug mismatch', { expected: slug, found: data.slug });
      return null;
    }
    
    if (!data.scheme || !data.scheme.name) {
      logError('Cache validation failed: Missing scheme name');
      return null;
    }
    
    if (!data.financialAssistance || !data.eligibility) {
      logError('Cache validation failed: Missing critical fact structure');
      return null;
    }

    if (inputContext && inputContext.schemeName && inputContext.primaryKeyword) {
      const expectedFingerprint = computeFingerprint(inputContext.schemeName, inputContext.primaryKeyword);
      if (data.researchFingerprint && data.researchFingerprint !== expectedFingerprint) {
        logInfo('Cache fingerprint mismatch, ignoring cache', { slug });
        return null;
      }
    }

    logInfo('Loaded valid research from cache', { slug });
    return data;
  } catch (error) {
    logError('Failed to load research cache', error);
    return null;
  }
}

module.exports = { saveResearchCache, loadResearchCache, computeFingerprint };

