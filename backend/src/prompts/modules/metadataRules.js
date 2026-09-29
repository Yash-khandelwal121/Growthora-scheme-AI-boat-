const metadataRules = `
==================================================
GROWTHORA METADATA RULES
==================================================
Preserve Growthora's existing internal metadata standards.
META TITLE: Target approximately 50 characters. Do not force an exact count if clarity suffers.
META DESCRIPTION: Target approximately 150 characters. Must describe the page clearly, include the topic naturally, communicate useful value, avoid clickbait, avoid stuffing.

==================================================
SLUG RULE
==================================================
Generate a short clean slug (e.g. mudra-loan-scheme-2026).
Rules: lowercase, hyphen separated, no unnecessary filler, no keyword stuffing.
For schemePage canonical URL use the existing Growthora route: https://growthora.co.in/govtschemes/{slug}. Do NOT use /blog/ for schemePage.
`;

module.exports = { metadataRules };
