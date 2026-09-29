require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./src/services/contentService');
const { checkFactGuard } = require('./src/utils/factGuard');

async function inspectFactGuard() {
  const cachePath = path.join(__dirname, 'data/research-cache/pm-vishwakarma-scheme-2026.master-research.json');
  const masterResearch = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  const articleResult = await generateArticle(masterResearch);
  const fgResult = checkFactGuard(articleResult, masterResearch);

  console.log("==================================================");
  console.log("FACTGUARD ANALYSIS FOR PM VISHWAKARMA");
  console.log("==================================================");
  console.log(`Passed: ${fgResult.passed}`);
  console.log(`Unsupported Facts Count: ${fgResult.unsupportedFacts?.length || 0}`);
  (fgResult.unsupportedFacts || []).forEach((f, idx) => console.log(`Failure #${idx + 1}: ${f}`));
}

inspectFactGuard();
