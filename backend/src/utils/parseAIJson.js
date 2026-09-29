function extractBalancedJsonObject(str) {
  if (!str) return null;
  
  let startIdx = -1;
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (char === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          return str.substring(startIdx, i + 1);
        }
      }
    }
  }

  return null;
}

function sanitizeUnescapedJsonStrings(jsonStr) {
  if (!jsonStr) return jsonStr;
  
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        const code = char.charCodeAt(0);
        if (code < 32) {
          // skip control chars
        } else {
          result += char;
        }
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

function parseAIJson(jsonString, contextStage = 'normalization') {
  if (!jsonString || typeof jsonString !== 'string') {
    const err = new Error(`Empty or non-string response received during ${contextStage}`);
    err.customPayload = {
      success: false,
      mode: "free_live_test",
      provider: "groq",
      stage: contextStage,
      errorCategory: "INVALID_STRUCTURED_JSON",
      message: `Empty or non-string response received from Groq during ${contextStage}`
    };
    throw err;
  }
  
  let cleanStr = jsonString.trim();

  // 1. Try direct JSON.parse
  let parsedObj = null;
  try {
    parsedObj = JSON.parse(cleanStr);
  } catch (_) {}

  // 2. Strip markdown code fences if present
  if (!parsedObj && cleanStr.includes('```')) {
    let unFenced = cleanStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      parsedObj = JSON.parse(unFenced);
    } catch (_) {}
  }

  // 3. Try fixing unescaped control characters in raw string
  if (!parsedObj) {
    try {
      const sanitized = sanitizeUnescapedJsonStrings(cleanStr);
      parsedObj = JSON.parse(sanitized);
    } catch (_) {}
  }

  // 4. Extract first balanced JSON object
  if (!parsedObj) {
    const balancedObjStr = extractBalancedJsonObject(cleanStr);
    if (balancedObjStr) {
      try {
        parsedObj = JSON.parse(balancedObjStr);
      } catch (_) {
        try {
          const sanitizedBalanced = sanitizeUnescapedJsonStrings(balancedObjStr);
          parsedObj = JSON.parse(sanitizedBalanced);
        } catch (_) {}
      }
    }
  }

  // 5. Fallback: find outer braces if balanced failed
  if (!parsedObj) {
    const firstBrace = cleanStr.indexOf('{');
    const lastBrace = cleanStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleanStr.substring(firstBrace, lastBrace + 1);
      try {
        parsedObj = JSON.parse(candidate);
      } catch (_) {
        try {
          parsedObj = JSON.parse(sanitizeUnescapedJsonStrings(candidate));
        } catch (_) {}
      }
    }
  }
  
  if (parsedObj) {
    // SAFE ALIAS NORMALIZATION
    if (parsedObj.article && typeof parsedObj.article === 'object') {
      if (!parsedObj.article.detailedDescription) {
        if (parsedObj.article.detailed_description) {
          parsedObj.article.detailedDescription = parsedObj.article.detailed_description;
          delete parsedObj.article.detailed_description;
        } else if (parsedObj.article.description) {
          parsedObj.article.detailedDescription = parsedObj.article.description;
          delete parsedObj.article.description;
        } else if (parsedObj.article.articleBody) {
          parsedObj.article.detailedDescription = parsedObj.article.articleBody;
          delete parsedObj.article.articleBody;
        }
      }
    }
    return parsedObj;
  }

  console.error(`Failed to parse AI JSON during ${contextStage}:`, jsonString.slice(0, 300));

  console.error(`Failed to parse AI JSON during ${contextStage}:`, jsonString.slice(0, 300));
  const parsingError = new Error(`Invalid JSON response from AI provider during ${contextStage}`);
  parsingError.customPayload = {
    success: false,
    mode: "free_live_test",
    provider: "groq",
    stage: contextStage,
    errorCategory: "INVALID_STRUCTURED_JSON",
    message: `Groq response during ${contextStage} could not be parsed into valid JSON.`
  };
  throw parsingError;
}

module.exports = {
  parseAIJson
};
