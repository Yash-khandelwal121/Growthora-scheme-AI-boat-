require('dotenv').config();
process.env.USE_MOCK_CONTENT = 'true';
process.env.GROQ_FREE_LIVE_TEST = 'false';
const fs = require('fs');
const path = require('path');
const { generateArticle } = require('../src/services/contentService');

async function inspectPmegp() {
  const pmegpPath = path.join(__dirname, '../data/research-cache/pmegp-scheme-2026.master-research.json');
  const pmegpResearch = JSON.parse(fs.readFileSync(pmegpPath, 'utf8'));

  const finalArticle = await generateArticle(pmegpResearch);
  console.log("=== PMEGP finalArticle top-level keys ===");
  console.log(Object.keys(finalArticle));
  console.log("\n=== PMEGP finalArticle.seo ===");
  console.log(finalArticle.seo);
  console.log("\n=== PMEGP finalArticle.article keys ===");
  console.log(finalArticle.article ? Object.keys(finalArticle.article) : null);
  console.log("\n=== PMEGP finalArticle.audit ===");
  console.log(finalArticle.audit);
  console.log("\n=== PMEGP finalArticle.schema ===");
  console.log(finalArticle.schema ? 'Schema Present' : 'Schema Missing');
}

inspectPmegp();
