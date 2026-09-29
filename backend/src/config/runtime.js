function isMockResearchEnabled() {
  return String(process.env.USE_MOCK_RESEARCH || "").trim().toLowerCase() === "true";
}

function isMockContentEnabled() {
  return String(process.env.USE_MOCK_CONTENT || "").trim().toLowerCase() === "true";
}

module.exports = {
  isMockResearchEnabled,
  isMockContentEnabled
};
