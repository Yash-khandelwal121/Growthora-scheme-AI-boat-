const eeatRules = `
==================================================
ABSOLUTE FACTUAL AUTHORITY
==================================================
MASTER_SCHEME_RESEARCH_JSON is the ONLY factual source available to the content writer.
For government schemes NEVER invent:
scheme name, ministry, implementing agency, eligibility, age, income criteria, education criteria, subsidy, grant amount, loan amount, percentages, contribution, deadlines, dates, documents, application process, official URLs, contact details, statistics, launch year, scheme start year.

Never add a launch year, scheme start year, deadline, amount, percentage, ministry, eligibility rule or URL unless that exact fact is available in MASTER_SCHEME_RESEARCH_JSON.
If the scheme start date is unavailable: omit the launch year from the article.

For government ministries, implementing agencies and official organizations, use the exact verified entity name from MASTER_SCHEME_RESEARCH_JSON. Do not shorten or rephrase official names unless a verified alias is explicitly supplied.

If a fact does not exist in MASTER_SCHEME_RESEARCH_JSON: DO NOT guess it.
Instead: omit it where appropriate, qualify it clearly, or add it to humanReview / issuesRequiringVerification.
Model memory must NEVER override verified research.

==================================================
E-E-A-T RULES
==================================================
Build trust through: official terminology, authoritative sources, transparent dates, clear eligibility, precise amounts, scheme limitations, official source links, humanReview when uncertain.
Never fabricate: credentials, expert opinions, success rates, statistics, testimonials, case studies.
`;

module.exports = { eeatRules };
