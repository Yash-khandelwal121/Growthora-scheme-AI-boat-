/**
 * SEO Meta Validator & Normalizer Utility
 * Guarantees NO truncation ("...") in metaTitle or metaDescription.
 * Enforces internal targets (~50 chars for title, ~150 chars for description).
 */

function cleanTrailingJunk(str) {
  if (!str) return '';
  let s = str
    .replace(/\s*[\.\.\.…]+$/g, '') // Remove trailing ellipsis
    .replace(/\s*[\-\|:,;&]\s*$/g, '') // Remove trailing separators
    .replace(/\s+(?:in|for|of|to|and|with|by|the|a|an|or|on|at|step-by-step|step by step)\s*$/gi, '') // Remove trailing prepositions/conjunctions
    .trim();

  // Second pass to ensure no newly exposed trailing fragment
  s = s.replace(/\s+(?:in|for|of|to|and|with|by|the|a|an|or|on|at|step-by-step|step by step)\s*$/gi, '').trim();
  return s;
}

function sanitizeMetaTitle(title) {
  if (!title) return '';
  let cleaned = cleanTrailingJunk(title);

  if (cleaned.length > 60) {
    // Try to cut at a clean separator like ":" or "|" if present
    const parts = cleaned.split(/[:|]/);
    if (parts.length > 1 && parts[0].trim().length >= 35 && parts[0].trim().length <= 60) {
      cleaned = cleanTrailingJunk(parts[0].trim());
    } else {
      // Cut cleanly at word boundary before 60 chars
      const truncated = cleaned.substring(0, 58);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 30) {
        cleaned = cleanTrailingJunk(truncated.substring(0, lastSpace));
      } else {
        cleaned = cleanTrailingJunk(truncated);
      }
    }
  }

  return cleaned;
}

function sanitizeMetaDescription(desc) {
  if (!desc) return '';
  let cleaned = cleanTrailingJunk(desc);

  if (cleaned.length > 160) {
    // Try sentence splitting first
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    let built = "";
    for (const sentence of sentences) {
      if ((built + sentence).trim().length <= 160) {
        built += (built ? " " : "") + sentence.trim();
      } else {
        break;
      }
    }

    if (built.length >= 80) {
      cleaned = built.trim();
    } else {
      // Clean word cut before 155 chars and append period if missing
      const truncated = cleaned.substring(0, 155);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 80) {
        cleaned = cleanTrailingJunk(truncated.substring(0, lastSpace));
      } else {
        cleaned = cleanTrailingJunk(truncated);
      }
    }
  }

  cleaned = cleanTrailingJunk(cleaned);
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}

function enforceMetaLimits(seoData) {
  if (!seoData) return seoData;

  if (seoData.metaTitle) {
    seoData.metaTitle = sanitizeMetaTitle(seoData.metaTitle);
  }

  if (seoData.metaDescription) {
    seoData.metaDescription = sanitizeMetaDescription(seoData.metaDescription);
  }

  seoData.metaTitleCharacterCount = seoData.metaTitle ? seoData.metaTitle.length : 0;
  seoData.metaDescriptionCharacterCount = seoData.metaDescription ? seoData.metaDescription.length : 0;

  return seoData;
}

function validateMetadata(seoData) {
  const metaTitle = seoData.metaTitle || "";
  const metaDescription = seoData.metaDescription || "";

  const titleCount = metaTitle.length;
  const descCount = metaDescription.length;

  const failures = [];

  if (titleCount > 60) {
    failures.push("Meta title exceeds 60 characters (actual: " + titleCount + ")");
  }

  if (descCount > 160) {
    failures.push("Meta description exceeds 160 characters (actual: " + descCount + ")");
  }

  if (metaTitle.includes("...") || metaTitle.includes("…")) {
    failures.push("Meta title contains truncation dots ('...')");
  }

  if (metaDescription.includes("...") || metaDescription.includes("…")) {
    failures.push("Meta description contains truncation dots ('...')");
  }

  if (/(?:and|or|with|for|step-by-step|&|,|:)\s*\.?$/i.test(metaDescription)) {
    failures.push("Meta description ends with an incomplete word or trailing conjunction");
  }

  return {
    passed: failures.length === 0,
    titleCount,
    descCount,
    failures
  };
}

module.exports = {
  sanitizeMetaTitle,
  sanitizeMetaDescription,
  enforceMetaLimits,
  validateMetadata
};
