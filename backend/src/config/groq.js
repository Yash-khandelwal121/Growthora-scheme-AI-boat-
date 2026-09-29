let _groqClient = null;

function isFreeLiveTestEnabled() {
  return String(process.env.USE_FREE_LIVE_TEST || "").trim().toLowerCase() === "true";
}

function isGroqLiveWebResearchEnabled() {
  return String(process.env.USE_GROQ_LIVE_WEB_RESEARCH || "").trim().toLowerCase() === "true";
}

function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
}

function getGroqClient() {
  if (!isGroqConfigured()) {
    throw new Error("Groq API Key is not configured.");
  }
  if (!_groqClient) {
    const { Groq } = require("groq-sdk");
    _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groqClient;
}

function getGroqResearchPrimaryModel() {
  return process.env.GROQ_RESEARCH_PRIMARY_MODEL || "qwen/qwen3.8-27b";
}

function getGroqResearchFallbackModel() {
  return process.env.GROQ_RESEARCH_FALLBACK_MODEL || "openai/gpt-oss-20b";
}

function getGroqVerifierModel() {
  return process.env.GROQ_VERIFIER_MODEL || "openai/gpt-oss-20b";
}

function getGroqContentPrimaryModel() {
  return process.env.GROQ_CONTENT_PRIMARY_MODEL || "qwen/qwen3.8-27b";
}

function getGroqContentFallbackModel() {
  return process.env.GROQ_CONTENT_FALLBACK_MODEL || "openai/gpt-oss-20b";
}

function getGroqHeavyFallbackModel() {
  return process.env.GROQ_HEAVY_FALLBACK_MODEL || "openai/gpt-oss-120b";
}

function getGroqSafetyModel() {
  return process.env.GROQ_SAFETY_MODEL || "openai/gpt-oss-safeguard-20b";
}

function getResearchFallbackModels() {
  return [getGroqResearchPrimaryModel(), getGroqResearchFallbackModel(), getGroqHeavyFallbackModel()];
}

function getContentFallbackModels() {
  return [getGroqContentPrimaryModel(), getGroqContentFallbackModel(), getGroqHeavyFallbackModel()];
}

function getVerifierFallbackModels() {
  return [getGroqVerifierModel(), getGroqResearchPrimaryModel(), getGroqHeavyFallbackModel()];
}

module.exports = {
  isFreeLiveTestEnabled,
  isGroqLiveWebResearchEnabled,
  isGroqConfigured,
  getGroqClient,
  getGroqResearchPrimaryModel,
  getGroqResearchFallbackModel,
  getGroqVerifierModel,
  getGroqContentPrimaryModel,
  getGroqContentFallbackModel,
  getGroqHeavyFallbackModel,
  getGroqSafetyModel,
  getResearchFallbackModels,
  getContentFallbackModels,
  getVerifierFallbackModels
};
