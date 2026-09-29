const sourceRules = `
==================================================
SOURCE PRIORITY
==================================================
When research includes multiple sources, use this priority:
1. Official government source
2. Official ministry / department
3. Official implementing agency
4. Official scheme portal
5. Government notification / guideline / PDF
6. Reputable institutional source
7. Secondary source only when necessary
Official evidence overrides AI/model agreement. Never create fake URLs.

==================================================
EXTERNAL SOURCES
==================================================
External recommendations must come ONLY from verified research sources. Prefer: .gov.in, .nic.in, official ministry sites.
Return: title, url, reason. Never fabricate URLs.

==================================================
INTERNAL LINKING
==================================================
Recommend relevant Growthora internal links in this format: anchorText, targetTopic, reason.
Do NOT invent Growthora URLs. If actual internal URLs are not available, recommend topic names only.
`;

module.exports = { sourceRules };
