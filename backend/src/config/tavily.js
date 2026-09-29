const isTavilyLiveSearchEnabled = () => {
  return process.env.USE_TAVILY_LIVE_SEARCH === 'true';
};

const getTavilyApiKey = () => {
  return process.env.TAVILY_API_KEY || '';
};

const isTavilyConfigured = () => {
  const key = getTavilyApiKey();
  return isTavilyLiveSearchEnabled() && key && key.trim() !== '';
};

module.exports = {
  isTavilyLiveSearchEnabled,
  getTavilyApiKey,
  isTavilyConfigured
};
