function dedupeSources(sources) {
  const uniqueUrls = new Map();
  
  sources.forEach(source => {
    if (!source || !source.url) return;
    
    try {
      const urlObj = new URL(source.url);
      
      // Normalize URL
      // Remove trailing slash
      let normalizedUrl = urlObj.origin + urlObj.pathname;
      if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
      }
      
      // Keep query parameters but sort them if needed? 
      // For now, keep the original full URL if it's the first time we see this normalized base.
      // Better yet, just use a simple normalization for deduplication key
      const dedupKey = normalizedUrl.toLowerCase();
      
      if (!uniqueUrls.has(dedupKey)) {
        uniqueUrls.set(dedupKey, source);
      } else {
        // Merge supportsFacts if needed
        const existing = uniqueUrls.get(dedupKey);
        if (source.supportsFacts && source.supportsFacts.length > 0) {
          const mergedFacts = new Set([...(existing.supportsFacts || []), ...source.supportsFacts]);
          existing.supportsFacts = Array.from(mergedFacts);
        }
      }
    } catch (e) {
      // Invalid URL, skip
    }
  });
  
  return Array.from(uniqueUrls.values());
}

module.exports = { dedupeSources };
