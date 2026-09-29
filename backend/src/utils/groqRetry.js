const { logInfo, logError, logWarning } = require('../utils/logger');
const { parseProviderError } = require('../utils/providerErrorCategories');

async function withGroqRetry(agentName, fallbackModels, operation) {
  let modelIndex = 0;
  let attempt = 0;
  const maxRetriesPerModel = 2;

  let lastError = null;

  while (modelIndex < fallbackModels.length) {
    const currentModel = fallbackModels[modelIndex];
    try {
      return await operation(currentModel, attempt);
    } catch (error) {
      lastError = error;
      const parsedError = parseProviderError(error, 'Groq');
      const statusCode = error.status || (error.response && error.response.status);
      
      const isRetryable = [400, 429, 500, 502, 503, 504].includes(statusCode);
      
      const limitType = parsedError.customPayload && parsedError.customPayload.limitType;
      const isDailyLimit = limitType === 'TPD' || limitType === 'RPD';
      const isTruncated = parsedError.customPayload && parsedError.customPayload.errorCategory === 'STRUCTURED_OUTPUT_TRUNCATED';
      
      if (isDailyLimit || (statusCode === 400 && !isTruncated)) {
        logWarning(`${agentName} encountered ${statusCode} or Daily Limit on ${currentModel}. Falling back to next model...`);
        modelIndex++;
        attempt = 0;
        continue;
      }
      
      if ((isRetryable || isTruncated) && attempt < maxRetriesPerModel) {
        attempt++;
        let waitTime = 2000;
        if (parsedError.retryAfter) waitTime = parsedError.retryAfter * 1000;
        logInfo(`${agentName} encountered ${statusCode}, retrying ${currentModel}... (Attempt ${attempt}/${maxRetriesPerModel})`);
        await new Promise(res => setTimeout(res, waitTime));
        continue;
      }
      
      logWarning(`${agentName} exhausted retries for ${currentModel}. Falling back to next model...`);
      modelIndex++;
      attempt = 0;
    }
  }
  
  throw new Error(`${agentName} failed on all fallback models. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

module.exports = {
  withGroqRetry
};
