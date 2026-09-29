require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const fs = require('fs');
const path = require('path');
const { generateArticle } = require('./src/services/contentService');
const { checkFactGuard } = require('./src/utils/factGuard');

async function inspectCgtmse() {
  const researchPath = path.join(__dirname, 'data/research-cache/cgtmse-scheme-2026.master-research.json');
  if (!fs.existsSync(researchPath)) {
    console.error("CGTMSE master research JSON not found");
    process.exit(1);
  }

  const masterResearch = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

  console.log("Generating article for CGTMSE...");
  const articleResult = await generateArticle(masterResearch);

  const fgResult = checkFactGuard(articleResult, masterResearch);

  console.log("\n==================================================");
  console.log("FACTGUARD ANALYSIS RESULTS FOR CGTMSE");
  console.log("==================================================");
  console.log(`Passed: ${fgResult.passed}`);
  console.log(`Unsupported Facts Count: ${fgResult.unsupportedFacts?.length || 0}`);
  console.log("\n--- EXACT UNSUPPORTED CLAIMS ---");
  (fgResult.unsupportedFacts || []).forEach((item, index) => {
    console.log(`\nFailure #${index + 1}:`);
    console.log(JSON.stringify(item, null, 2));
  });

  console.log("\n--- AUDIT FAILURES ---");
  (articleResult.audit?.failures || []).forEach(f => console.log("- ", f));

  console.log("\n--- META TITLE INFO ---");
  console.log("Meta Title:", articleResult.seo?.metaTitle);
  console.log("Length:", (articleResult.seo?.metaTitle || "").length);

  // Save full articleResult to file for inspection
  fs.writeFileSync(path.join(__dirname, 'cgtmse-generated-article.json'), JSON.stringify(articleResult, null, 2));
}

inspectCgtmse().catch(console.error);
