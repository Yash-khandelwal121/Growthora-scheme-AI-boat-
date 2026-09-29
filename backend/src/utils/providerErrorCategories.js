function categorizeProviderError(error, providerName) {
  const status = error.status || error.code || error.response?.status;
  const message = (error.message || '').toLowerCase();
  
  if (status === 401) {
    return 'authentication_failed';
  }
  
  const errorCode = error.error?.error?.code || error.error?.code || error.code;
  const failedGen = error.error?.error?.failed_generation || error.error?.failed_generation || '';
  
  if (status === 400 && errorCode === 'json_validate_failed') {
    const isTruncated = failedGen.includes('max completion tokens reached') || 
                        failedGen.includes('before generating a valid document') ||
                        message.includes('maximum completion tokens') ||
                        message.includes('valid document');
    if (isTruncated) return 'structured_output_truncated';
  }
  
  if (status === 402 || 
      (status === 429 && message.includes('quota')) || 
      (status === 429 && message.includes('credit')) || 
      (status === 429 && message.includes('billing')) ||
      (status === 400 && message.includes('credit balance is too low'))) {
    return 'billing_required'; // or rate_limited
  }
  
  if (status === 403) {
    return 'authentication_failed';
  }
  
  if (status === 404 || 
      message.includes('model not found') || 
      message.includes('does not exist')) {
    return 'model_unavailable';
  }
  
  if (status === 429) {
    return 'rate_limited';
  }
  
  if (status === 503 || 
      status === 502 || 
      status === 504 || 
      message.includes('high demand') || 
      message.includes('temporarily unavailable') || 
      message.includes('overloaded')) {
    return 'temporary_unavailable';
  }
  
  return 'unknown_provider_error';
}

function parseProviderError(error, providerName) {
  let category = categorizeProviderError(error, providerName);
  const status = error.status || error.code || error.response?.status || 'Unknown';
  
  const sanitizedMessage = error.error?.message || error.message || String(error);
  
  // Refine category if it's billing_required but actually a Groq quota
  if (category === 'billing_required' && status === 429) {
      category = 'rate_limited';
  }

  const customError = new Error("[" + providerName + "] " + category + ": " + sanitizedMessage);
  customError.category = category;
  customError.providerStatus = status;
  customError.provider = providerName;
  
  if (category === 'rate_limited') {
      let limitType = "UNKNOWN";
      let retryAfterSeconds = null;
      let friendlyMessage = `${providerName} rate limit reached.`;
      
      const lowerMsg = sanitizedMessage.toLowerCase();
      if (lowerMsg.includes('tokens per day') || lowerMsg.includes('tpd')) {
          limitType = 'TPD';
          friendlyMessage = `${providerName} daily token limit reached.`;
      } else if (lowerMsg.includes('requests per day') || lowerMsg.includes('rpd')) {
          limitType = 'RPD';
          friendlyMessage = `${providerName} daily request limit reached.`;
      } else if (lowerMsg.includes('tokens per minute') || lowerMsg.includes('tpm')) {
          limitType = 'TPM';
          friendlyMessage = `${providerName} per-minute token limit reached.`;
      } else if (lowerMsg.includes('requests per minute') || lowerMsg.includes('rpm')) {
          limitType = 'RPM';
          friendlyMessage = `${providerName} per-minute request limit reached.`;
      }

      // Try to parse retry after from message if header is missing
      // "Please try again in 14m43.872s" or "try again in 5s"
      let retryAt = null;
      
      // If we have headers, use retry-after
      if (error.response && error.response.headers) {
          const ra = error.response.headers['retry-after'];
          if (ra) {
              const parsedRa = parseFloat(ra);
              if (!isNaN(parsedRa)) {
                  retryAfterSeconds = parsedRa;
              }
          }
      }
      
      if (retryAfterSeconds === null) {
          const retryMatch = sanitizedMessage.match(/try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)/i);
          if (retryMatch) {
              const h = parseFloat(retryMatch[1] || 0);
              const m = parseFloat(retryMatch[2] || 0);
              const s = parseFloat(retryMatch[3] || 0);
              retryAfterSeconds = Math.ceil((h * 3600) + (m * 60) + s);
          }
      }

      if (retryAfterSeconds) {
          retryAt = new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
      }

      customError.customPayload = {
          success: false,
          provider: providerName.toLowerCase(),
          errorCategory: 'RATE_LIMITED',
          limitType: limitType,
          message: friendlyMessage,
          retryAfterSeconds: retryAfterSeconds,
          retryAt: retryAt,
          retryable: true
      };
      customError.statusCode = 429;
  } else if (category === 'structured_output_truncated') {
      customError.customPayload = {
          success: false,
          provider: providerName.toLowerCase(),
          errorCategory: 'STRUCTURED_OUTPUT_TRUNCATED',
          message: 'Output truncated before generating a valid document.',
          retryable: true
      };
      customError.statusCode = 400;
  }
  
  return customError;
}

module.exports = {
  categorizeProviderError,
  parseProviderError
};
