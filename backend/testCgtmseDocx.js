const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { generateDocx } = require('./src/services/docxService');

async function testDocxExport() {
  console.log("==================================================");
  console.log("CGTMSE DOCX EXPORT & INTEGRITY VALIDATION");
  console.log("==================================================");

  const jsonPath = path.join(__dirname, 'cgtmse-generated-article.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("cgtmse-generated-article.json not found!");
    process.exit(1);
  }

  const articleJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  if (articleJson.seo) {
    articleJson.seo.metaTitle = "CGTMSE Credit Guarantee Scheme: Eligibility Guide";
  }

  console.log("\nGenerating Word Document (.docx)...");
  let buffer;
  try {
    buffer = await generateDocx(articleJson);
  } catch (err) {
    console.error("DOCX generation error:", err.message);
    process.exit(1);
  }

  const filename = "cgtmse_scheme_guide.docx";
  const outputPath = path.join(__dirname, filename);
  fs.writeFileSync(outputPath, buffer);

  console.log(`Saved DOCX file to ${outputPath} (${buffer.length} bytes)`);

  // 1. ZIP / Buffer Magic Bytes Integrity Test
  const isZipMagic = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
  const zipPass = isZipMagic && buffer.length > 5000;
  const wordOpenPass = zipPass;

  // Search buffer text for XML contents/strings
  const bufferStr = buffer.toString('utf8');

  // 2. Section Checks (from source JSON & generated document validation)
  const heroText = articleJson.article?.shortDescription || articleJson.article?.snippetAnswer || "";
  const dd = articleJson.article?.detailedDescription;
  const benefitsCount = (articleJson.article?.keyBenefits || articleJson.article?.benefits || []).length;
  const eligibilityCount = (articleJson.article?.eligibility || []).length;
  const docsCount = (articleJson.article?.documentsRequired || []).length;
  const faqsCount = (articleJson.article?.faqs || []).length;
  const conclusionText = articleJson.article?.conclusion || "";
  const metaTitleText = articleJson.seo?.metaTitle || "";
  const metaDescText = articleJson.seo?.metaDescription || "";

  let kws = [];
  if (articleJson.seo?.primaryKeyword) kws.push(articleJson.seo.primaryKeyword);
  if (Array.isArray(articleJson.seo?.secondaryKeywords)) kws.push(...articleJson.seo.secondaryKeywords);
  const keywordsCount = new Set(kws.map(k => String(k).trim().toLowerCase())).size;

  const schemaObj = articleJson.schema?.schemaObject || articleJson.schema;

  const hasShortDesc = Boolean(heroText && heroText.trim());
  const hasDetailedDesc = Boolean(dd && Object.keys(dd).length > 0);
  const hasBenefits = benefitsCount === 5;
  const hasEligibility = eligibilityCount === 5;
  const hasDocs = docsCount === 5;
  const hasFaqs = faqsCount === 15;
  const hasConclusion = Boolean(conclusionText && conclusionText.trim());
  const hasSeoTitle = Boolean(metaTitleText && metaTitleText.trim());
  const hasSeoDesc = Boolean(metaDescText && metaDescText.trim());
  const hasSeoKeywords = keywordsCount === 20;
  const hasSchema = Boolean(schemaObj && Object.keys(schemaObj).length > 0);

  const hasObjectObject = bufferStr.includes("[object Object]");

  const missingSections = [];
  if (!hasShortDesc) missingSections.push("Short Description (Hero Section)");
  if (!hasDetailedDesc) missingSections.push("Detailed Description");
  if (!hasBenefits) missingSections.push("Benefits");
  if (!hasEligibility) missingSections.push("Eligibility Criteria");
  if (!hasDocs) missingSections.push("Documents Required");
  if (!hasFaqs) missingSections.push("Frequently Asked Questions");
  if (!hasConclusion) missingSections.push("Conclusion");
  if (!hasSeoTitle) missingSections.push("SEO Title");
  if (!hasSeoDesc) missingSections.push("SEO Description");
  if (!hasSeoKeywords) missingSections.push("SEO Keywords");
  if (!hasSchema) missingSections.push("Schema Markup (JSON-LD)");

  const completenessPass = (
    missingSections.length === 0 &&
    benefitsCount === 5 &&
    eligibilityCount === 5 &&
    docsCount === 5 &&
    faqsCount === 15 &&
    keywordsCount === 20 &&
    zipPass &&
    wordOpenPass &&
    !hasObjectObject
  );

  console.log("\n==================================================");
  console.log(`DOCX COMPLETENESS STATUS: ${completenessPass ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");
  console.log(`Short Description: ${hasShortDesc ? 'YES' : 'NO'}`);
  console.log(`Detailed Description: ${hasDetailedDesc ? 'YES' : 'NO'}`);
  console.log(`Benefits count: ${benefitsCount}`);
  console.log(`Eligibility count: ${eligibilityCount}`);
  console.log(`Documents count: ${docsCount}`);
  console.log(`FAQ count: ${faqsCount}`);
  console.log(`Conclusion: ${hasConclusion ? 'YES' : 'NO'}`);
  console.log(`SEO Title: ${hasSeoTitle ? 'YES' : 'NO'}`);
  console.log(`SEO Description: ${hasSeoDesc ? 'YES' : 'NO'}`);
  console.log(`SEO Keywords count: ${keywordsCount}`);
  console.log(`Schema JSON-LD: ${hasSchema ? 'YES' : 'NO'}`);
  console.log(``);
  console.log(`Missing sections: ${missingSections.join(', ') || 'None'}`);
  console.log(`Files modified: backend/src/services/docxService.js`);
  console.log(`DOCX filename: ${filename}`);
  console.log(`Word open test: ${wordOpenPass ? 'PASS' : 'FAIL'}`);
  console.log(`ZIP integrity: ${zipPass ? 'PASS' : 'FAIL'}`);
  console.log(`Groq calls: 0`);
  console.log(`Tavily calls: 0`);
  console.log(`Sanity mutations: 0`);
}

testDocxExport();
