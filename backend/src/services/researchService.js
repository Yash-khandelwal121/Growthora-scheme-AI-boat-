const { runOpenAIResearch } = require('../agents/openaiResearchAgent');
const { runGeminiResearch } = require('../agents/geminiResearchAgent');
const { runClaudeVerification } = require('../agents/claudeVerifierAgent');
const { resolveFacts } = require('../agents/factResolverAgent');
const { logInfo, logError, logWarning } = require('../utils/logger');
const openaiConfig = require('../config/openai');
const geminiConfig = require('../config/gemini');
const anthropicConfig = require('../config/anthropic');

// Mocks
const openaiMock = require('../mocks/openaiMockResearch');
const geminiMock = require('../mocks/geminiMockResearch');
const claudeMock = require('../mocks/claudeMockVerification');

async function performResearch(inputData) {
  const researchContext = {
    ...inputData,
    researchDate: new Date().toISOString()
  };

  logInfo('Starting research orchestration', { schemeName: inputData.schemeName });

  const { isMockResearchEnabled } = require('../config/runtime');
  const { isFreeLiveTestEnabled, isGroqLiveWebResearchEnabled } = require('../config/groq');
  const { isTavilyLiveSearchEnabled } = require('../config/tavily');
  const isMock = isMockResearchEnabled();
  const isTavilyLiveWeb = !isMock && isTavilyLiveSearchEnabled();
  const isGroqLiveWeb = !isMock && !isTavilyLiveWeb && isFreeLiveTestEnabled() && isGroqLiveWebResearchEnabled();
  const isGroq = !isMock && !isTavilyLiveWeb && isFreeLiveTestEnabled() && !isGroqLiveWebResearchEnabled();

  let masterResearch = null;
  let openaiResult = null;
  let geminiResult = null;
  let claudeResult = null;

  if (isMock) {
    logInfo('Research mode: MOCK');
    openaiResult = openaiMock;
    geminiResult = geminiMock;
    claudeResult = claudeMock;
    
    // Explicitly add status: "simulated" so frontend does not mark as failed
    openaiResult.status = "simulated";
    openaiResult.completed = true;
    geminiResult.status = "simulated";
    geminiResult.completed = true;
    claudeResult.status = "simulated";
    claudeResult.completed = true;
  } else if (isTavilyLiveWeb) {
    logInfo('Research mode: TAVILY_LIVE_WEB_RESEARCH');
    const { runTavilyLiveWebResearch } = require('../agents/tavilySearchAgent');
    masterResearch = await runTavilyLiveWebResearch(researchContext);
  } else if (isGroqLiveWeb) {
    logInfo('Research mode: GROQ_LIVE_WEB_RESEARCH');
    const { runGroqLiveWebResearch } = require('../agents/groqWebResearchAgent');
    masterResearch = await runGroqLiveWebResearch(researchContext);
  } else if (isGroq) {
    logInfo('Research mode: GROQ_FREE_LIVE_TEST');
    const { runGroqResearch } = require('../agents/groqResearchAgent');
    const { runGroqSecondaryResearch } = require('../agents/groqSecondaryResearchAgent');
    const { runGroqVerification } = require('../agents/groqVerifierAgent');

    const researchPromises = [];

    logInfo('[Groq Research A] started');
    researchPromises.push(
      runGroqResearch(researchContext)
        .then(res => { 
          openaiResult = res; 
          logInfo('[Groq Research A] success');
        })
        .catch(err => { 
          logWarning(`[Groq Research A] failed: ${err.message || 'Unknown error'}`); 
        })
    );

    logInfo('[Groq Research B] started');
    researchPromises.push(
      runGroqSecondaryResearch(researchContext)
        .then(res => { 
          geminiResult = res; 
          logInfo('[Groq Research B] success');
        })
        .catch(err => { 
          logWarning(`[Groq Research B] failed: ${err.message || 'Unknown error'}`); 
        })
    );

    await Promise.allSettled(researchPromises);

    if (openaiResult || geminiResult) {
      try {
        logInfo('[Groq Verifier] started');
        claudeResult = await runGroqVerification(openaiResult, geminiResult, researchContext);
        logInfo('[Groq Verifier] success');
      } catch (err) {
        logWarning(`[Groq Verifier] failed: ${err.message || 'Unknown error'}`);
      }
    } else {
      logInfo('[Groq Verifier] skipped');
    }
  } else {
    logInfo('Research mode: LIVE');
    // STEP 1: Parallel Research (OpenAI + Gemini)
    const researchPromises = [];

    if (openaiConfig.isOpenAIConfigured()) {
      researchPromises.push(
        runOpenAIResearch(researchContext)
          .then(res => { openaiResult = res; })
          .catch(err => { logWarning('OpenAI research step failed', { error: err.message }); })
      );
    }

    if (geminiConfig.isGeminiConfigured()) {
      researchPromises.push(
        runGeminiResearch(researchContext)
          .then(res => { geminiResult = res; })
          .catch(err => { logWarning('Gemini research step failed', { error: err.message }); })
      );
    }

    await Promise.allSettled(researchPromises);

    // STEP 2: Claude Verification
    if (anthropicConfig.isAnthropicConfigured() && (openaiResult || geminiResult)) {
      try {
        claudeResult = await runClaudeVerification(researchContext, openaiResult, geminiResult);
      } catch (err) {
        logWarning('Claude verification step failed', { error: err.message });
      }
    }
  }

  // If masterResearch is null, we need to run resolveFacts (for older pipelines)
  if (!masterResearch) {
    // STEP 3: Fallback check
    if (!openaiResult && !geminiResult && !claudeResult) {
      if (isGroq) {
        logInfo('[Groq Normalize] failed');
        const errorObj = new Error('Groq Free Live Test completely failed.');
        errorObj.customPayload = {
          success: false,
          mode: "free_live_test",
          provider: "groq",
          stage: "groq_research",
          errorCategory: "ALL_AGENTS_FAILED",
          message: "Groq research agents failed to produce any valid output."
        };
        throw errorObj;
      }
      throw new Error('All AI providers failed or are not configured to perform research.');
    }

    logInfo('[Groq Normalize] success');
    // STEP 4: Resolve Facts
    masterResearch = resolveFacts(researchContext, openaiResult, geminiResult, claudeResult);
    
    if (isMock) {
      masterResearch.mode = "mock";
      masterResearch.liveResearch = false;
    } else if (isGroq) {
      masterResearch.mode = "free_live_test";
      masterResearch.provider = "groq";
      masterResearch.liveModelCalls = true;
      masterResearch.liveWebResearch = false;
      masterResearch.warning = "Real Groq AI model calls are active, but live official-source web verification is currently OFF.";
    }
  }
  
  logInfo('Research orchestration completed successfully', { researchId: masterResearch.researchId });
  
  return masterResearch;
}

module.exports = {
  performResearch
};
