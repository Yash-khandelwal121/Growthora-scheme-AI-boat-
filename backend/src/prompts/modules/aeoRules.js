const aeoRules = `
==================================================
SEARCH INTENT ANALYSIS
==================================================
Before generating content, determine:
searchIntent: informational, eligibility, how-to, financial assistance, application, documents, mixed intent
Also determine: primaryUserQuestion, secondaryUserQuestions, userJourney
Do not expose hidden chain-of-thought. Return concise structured intent outputs only.

==================================================
AEO RULES
==================================================
Important questions should have extractable direct answers.
For relevant sections:
Question / Heading → Direct answer in 1-3 sentences → Supporting explanation
Optimize especially for: What is [scheme]?, Who is eligible?, How much assistance is available?, Is it a grant, subsidy or loan?, What documents are required?, How do I apply?, Is there a deadline?, Who implements the scheme?, Can existing businesses apply?, What are the major conditions?
Do not turn every paragraph into Q&A.

==================================================
FEATURED SNIPPET RULES
==================================================
Create one snippetAnswer. Target: 40-60 words. It should answer the main query independently.
Also use where appropriate: numbered application steps, concise eligibility lists, key-fact tables, benefit lists, short definitions.
`;

module.exports = { aeoRules };
