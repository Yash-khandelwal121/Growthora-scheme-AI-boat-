function normalizeUrlForFactGuard(url) {
  try {
    // Strip trailing punctuation often caught by naive regex or trailing JSON characters
    let clean = url.replace(/["'()[\]{}.,:;\\]+$/, '');
    const parsed = new URL(clean);
    // Remove trailing slash from pathname if present, except if it's just '/'
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch(e) {
    return url.replace(/["'()[\]{}.,:;\\]+$/, '');
  }
}

function extractStrings(obj) {
  let strings = [];
  if (typeof obj === 'string') {
    strings.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => {
      strings = strings.concat(extractStrings(item));
    });
  } else if (obj !== null && typeof obj === 'object') {
    Object.values(obj).forEach(val => {
      strings = strings.concat(extractStrings(val));
    });
  }
  return strings;
}

function normalizeNumberFormat(numStr) {
  let clean = numStr.toLowerCase().replace(/,/g, '');
  if (clean.includes('lakh')) {
    let val = parseFloat(clean.replace('lakh', '').replace('lakhs', '').trim());
    if (!isNaN(val)) return (val * 100000).toString();
  }
  if (clean.includes('crore')) {
    let val = parseFloat(clean.replace('crore', '').replace('crores', '').trim());
    if (!isNaN(val)) return (val * 10000000).toString();
  }
  return clean.trim();
}

function extractCriticalEntities(stringsArray) {
  const numbers = [];
  const urls = [];
  
  stringsArray.forEach(text => {
    // Extract percentages
    const textPercentages = (text.match(/\d+(?:\.\d+)?%/g) || []);
    numbers.push(...textPercentages);
    
    // Extract numbers with optional suffixes
    const textNumbers = (text.match(/\b\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:lakh|crore)s?)?\b/gi) || []);
    textNumbers.forEach(n => {
      numbers.push(normalizeNumberFormat(n));
    });
    
    // Extract URLs
    const textUrls = (text.match(/https?:\/\/[^\s"'()[\]{}]+/g) || []);
    textUrls.forEach(u => {
      urls.push(normalizeUrlForFactGuard(u));
    });
  });
  
  return {
    numbers: [...new Set(numbers)],
    urls: [...new Set(urls)]
  };
}

function gatherResearchEntities(researchJson) {
  const strings = extractStrings(researchJson);
  const entities = extractCriticalEntities(strings);
  
  const allowedUrls = new Set(entities.urls);
  if (researchJson.scheme?.officialWebsite) {
    allowedUrls.add(normalizeUrlForFactGuard(researchJson.scheme.officialWebsite));
  }
  if (researchJson.scheme?.applicationWebsite) {
    allowedUrls.add(normalizeUrlForFactGuard(researchJson.scheme.applicationWebsite));
  }
  (researchJson.sources || []).forEach(s => {
    if (s.url) allowedUrls.add(normalizeUrlForFactGuard(s.url));
  });
  
  return {
    numbers: entities.numbers,
    urls: Array.from(allowedUrls)
  };
}

function checkFactGuard(articleData, researchJson) {
  const researchEntities = gatherResearchEntities(researchJson);
  const researchNumbers = new Set(researchEntities.numbers);
  const researchUrls = new Set(researchEntities.urls);
  
  const articleStrings = extractStrings(articleData.article);
  const articleEntities = extractCriticalEntities(articleStrings);
  
  const unsupportedFacts = [];
  
  // Check URLs
  articleEntities.urls.forEach(url => {
    if (!researchUrls.has(url)) {
      unsupportedFacts.push("Unsupported URL detected: " + url);
    }
  });
  
  // Check Numbers (ignoring structural list/faq indices 1-10, 15, 20)
  const listIndices = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "15", "20"]);
  articleEntities.numbers.forEach(num => {
    if (!researchNumbers.has(num) && !listIndices.has(num)) {
      unsupportedFacts.push("Unsupported number/percentage/amount detected: " + num);
    }
  });

  // Ministry and Agency names check
  const rawMinistry = researchJson.scheme?.ministry;
  const rawAgency = researchJson.scheme?.implementingAgency;
  let validMinistries = [];

  const processMinistryObj = (raw) => {
    if (typeof raw === 'string' && raw.trim() !== '') {
      validMinistries.push(raw.trim());
    } else if (raw && typeof raw === 'object') {
      if (raw.officialName) validMinistries.push(raw.officialName.trim());
      if (Array.isArray(raw.verifiedAliases)) {
        raw.verifiedAliases.forEach(alias => {
          if (typeof alias === 'string' && alias.trim() !== '') {
            validMinistries.push(alias.trim());
          }
        });
      }
    }
  };

  processMinistryObj(rawMinistry);
  processMinistryObj(rawAgency);

  if (validMinistries.length > 0) {
    articleStrings.forEach(text => {
      // Find occurrences of "Ministry of " followed by Capitalized words
      const matches = text.match(/\bMinistry of (?:[A-Z][a-zA-Z&,]+\s?)+/g);
      if (matches) {
        matches.forEach(m => {
          const matchedTrimmed = m.trim();
          if (matchedTrimmed === "Ministry of") return; // Ignore just the prefix
          
          let isValid = false;
          for (const validMinistry of validMinistries) {
            if (validMinistry.includes(matchedTrimmed) || matchedTrimmed.includes(validMinistry)) {
              isValid = true;
              break;
            }
          }
          
          if (!isValid) {
            unsupportedFacts.push("Unsupported Ministry mentioned: " + matchedTrimmed);
          }
        });
      }
    });
  }
  
  return {
    passed: unsupportedFacts.length === 0,
    unsupportedFacts: [...new Set(unsupportedFacts)]
  };
}

module.exports = {
  checkFactGuard,
  normalizeUrlForFactGuard,
  extractStrings
};
