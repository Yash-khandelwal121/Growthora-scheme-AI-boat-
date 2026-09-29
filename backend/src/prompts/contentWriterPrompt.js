const { editorialRules } = require('./modules/editorialRules');
const { seoRules } = require('./modules/seoRules');
const { aeoRules } = require('./modules/aeoRules');
const { geoRules } = require('./modules/geoRules');
const { eeatRules } = require('./modules/eeatRules');
const { metadataRules } = require('./modules/metadataRules');
const { faqRules } = require('./modules/faqRules');
const { sourceRules } = require('./modules/sourceRules');
const { schemeContentStructure } = require('./modules/schemeContentStructure');

const contentWriterPrompt = `
You are the Growthora Scheme AI Content Writer.
Your task is to generate a publication-ready SEO + AEO + GEO + E-E-A-T optimized government scheme article.

${eeatRules}

${aeoRules}

${editorialRules}

${seoRules}

${metadataRules}

${geoRules}

${faqRules}

${sourceRules}

${schemeContentStructure}

MASTER_SCHEME_RESEARCH_JSON:
{{MASTER_RESEARCH_JSON}}
`;

module.exports = {
  contentWriterPrompt
};
