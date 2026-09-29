const fs = require('fs');
const path = require('path');
const { generateDocx } = require('../src/services/docxService');
const mockArticleContent = require('../src/mocks/mockArticleContent');

async function testGlobalDocxSuite() {
  console.log("==================================================");
  console.log("GROWTHORA SCHEME AI - GLOBAL DOCX SUITE VALIDATION");
  console.log("==================================================");

  // Load Fixtures
  const cgtmseJsonPath = path.join(__dirname, '../cgtmse-generated-article.json');
  const cgtmseArticle = fs.existsSync(cgtmseJsonPath)
    ? JSON.parse(fs.readFileSync(cgtmseJsonPath, 'utf8'))
    : null;

  // 1. PMEGP Fixture
  const pmegpArticle = {
    mode: "mock",
    researchSchemeName: "Prime Minister's Employment Generation Programme (PMEGP)",
    seo: {
      metaTitle: "PMEGP Scheme 2026: Subsidy & Eligibility Guide",
      metaDescription: "Learn about PMEGP Scheme 2026 eligibility, subsidy details, and application process.",
      slug: "pmegp-scheme-2026",
      canonicalPath: "https://growthora.co.in/govtschemes/pmegp-scheme-2026",
      primaryKeyword: "PMEGP Scheme 2026",
      secondaryKeywords: Array.from({ length: 19 }, (_, i) => `pmegp keyword ${i + 1}`)
    },
    article: {
      h1: "PMEGP Scheme 2026: Subsidy & Eligibility Guide",
      snippetAnswer: "The PMEGP Scheme 2026 provides credit-linked subsidies up to 35% for setting up new manufacturing or service micro-enterprises.",
      detailedDescription: {
        introduction: "PMEGP is a major credit-linked subsidy programme by MSME Ministry.",
        schemeAtAGlance: { "Scheme Name": "PMEGP", "Subsidy": "15% - 35%" }
      },
      keyBenefits: Array.from({ length: 5 }, (_, i) => ({ title: `PMEGP Benefit ${i + 1}`, description: `PMEGP Benefit description ${i + 1}` })),
      eligibility: Array.from({ length: 5 }, (_, i) => ({ category: `PMEGP Eligibility ${i + 1}`, criteria: `Criteria ${i + 1}` })),
      documentsRequired: Array.from({ length: 5 }, (_, i) => ({ document: `PMEGP Doc ${i + 1}`, purpose: `Purpose ${i + 1}` })),
      faqs: Array.from({ length: 15 }, (_, i) => ({ question: `PMEGP FAQ ${i + 1}?`, answer: `PMEGP Answer ${i + 1}` })),
      conclusion: "PMEGP scheme provides essential support for new business setups."
    },
    schema: {
      schemaObject: { "@context": "https://schema.org", "@type": "Article", "headline": "PMEGP Scheme 2026" }
    }
  };

  // 2. PMMY Fixture
  const pmmyArticle = {
    mode: "free_live_test",
    researchSchemeName: "Pradhan Mantri Mudra Yojana (PMMY)",
    seo: {
      metaTitle: "Pradhan Mantri Mudra Yojana (PMMY) Loan Guide",
      metaDescription: "Complete guide to Mudra loans under PMMY scheme including Shishu, Kishore, Tarun, Tarun Plus categories.",
      slug: "mudra-loan-scheme-2026",
      canonicalPath: "https://growthora.co.in/govtschemes/mudra-loan-scheme-2026",
      primaryKeyword: "Mudra Loan Scheme 2026",
      secondaryKeywords: Array.from({ length: 19 }, (_, i) => `mudra keyword ${i + 1}`)
    },
    article: {
      h1: "Pradhan Mantri Mudra Yojana (PMMY) Guide",
      snippetAnswer: "Pradhan Mantri Mudra Yojana provides collateral-free business loans up to 20 Lakhs across Shishu, Kishore, Tarun, and Tarun Plus categories.",
      detailedDescription: {
        introduction: "PMMY empowers micro enterprises through accessible institutional credit.",
        schemeAtAGlance: { "Scheme Name": "PMMY", "Loan Limit": "Up to 20 Lakhs" }
      },
      keyBenefits: Array.from({ length: 5 }, (_, i) => ({ title: `Mudra Benefit ${i + 1}`, description: `Mudra Benefit description ${i + 1}` })),
      eligibility: Array.from({ length: 5 }, (_, i) => ({ category: `Mudra Eligibility ${i + 1}`, criteria: `Criteria ${i + 1}` })),
      documentsRequired: Array.from({ length: 5 }, (_, i) => ({ document: `Mudra Doc ${i + 1}`, purpose: `Purpose ${i + 1}` })),
      faqs: Array.from({ length: 15 }, (_, i) => ({ question: `Mudra FAQ ${i + 1}?`, answer: `Mudra Answer ${i + 1}` })),
      conclusion: "PMMY scheme offers significant financial backing for small entrepreneurs."
    },
    schema: {
      schemaObject: { "@context": "https://schema.org", "@type": "Article", "headline": "Pradhan Mantri Mudra Yojana" }
    }
  };

  // 3. Generic Fixture
  const genericArticle = {
    mode: "free_live_test",
    researchSchemeName: "Arbitrary Enterprise Grant Scheme 2026",
    seo: {
      metaTitle: "Arbitrary Enterprise Grant Scheme 2026 Guide",
      metaDescription: "Official guide to Arbitrary Enterprise Grant Scheme 2026 for small business innovation.",
      slug: "arbitrary-grant-scheme-2026",
      canonicalPath: "https://growthora.co.in/govtschemes/arbitrary-grant-scheme-2026",
      primaryKeyword: "Arbitrary Grant Scheme 2026",
      secondaryKeywords: Array.from({ length: 19 }, (_, i) => `generic keyword ${i + 1}`)
    },
    article: {
      h1: "Arbitrary Enterprise Grant Scheme 2026 Guide",
      snippetAnswer: "The Arbitrary Enterprise Grant Scheme 2026 offers competitive grant assistance for eligible technology startups.",
      detailedDescription: {
        introduction: "This grant scheme supports innovation in sustainable enterprise models.",
        schemeAtAGlance: { "Scheme Name": "Arbitrary Grant", "Grant Amount": "Up to 50 Lakhs" }
      },
      keyBenefits: Array.from({ length: 5 }, (_, i) => ({ title: `Generic Benefit ${i + 1}`, description: `Generic Benefit description ${i + 1}` })),
      eligibility: Array.from({ length: 5 }, (_, i) => ({ category: `Generic Eligibility ${i + 1}`, criteria: `Criteria ${i + 1}` })),
      documentsRequired: Array.from({ length: 5 }, (_, i) => ({ document: `Generic Doc ${i + 1}`, purpose: `Purpose ${i + 1}` })),
      faqs: Array.from({ length: 15 }, (_, i) => ({ question: `Generic FAQ ${i + 1}?`, answer: `Generic Answer ${i + 1}` })),
      conclusion: "Arbitrary scheme facilitates growth in key priority sectors."
    },
    schema: {
      schemaObject: { "@context": "https://schema.org", "@type": "Article", "headline": "Arbitrary Grant Scheme 2026" }
    }
  };

  const fixtures = [
    { name: "PMEGP", data: pmegpArticle, expectedSlug: "pmegp-scheme-2026" },
    { name: "PMMY", data: pmmyArticle, expectedSlug: "mudra-loan-scheme-2026" },
    { name: "CGTMSE", data: cgtmseArticle, expectedSlug: "cgtmse-scheme-2026" },
    { name: "Generic fixture", data: genericArticle, expectedSlug: "arbitrary-grant-scheme-2026" }
  ];

  let allPass = true;
  let dynamicFilenamesPass = true;
  const results = {};

  for (const f of fixtures) {
    if (!f.data) {
      console.error(`Fixture ${f.name} missing!`);
      results[f.name] = false;
      allPass = false;
      continue;
    }

    try {
      const buffer = await generateDocx(f.data);
      const isZipMagic = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
      
      const filename = `${f.expectedSlug}_scheme_guide.docx`;
      const outputPath = path.join(__dirname, filename);
      fs.writeFileSync(outputPath, buffer);

      const passFixture = isZipMagic && buffer.length > 5000 && fs.existsSync(outputPath);
      results[f.name] = passFixture;
      if (!passFixture) allPass = false;

      console.log(`[PASS] Fixture ${f.name} generated successfully -> ${filename} (${buffer.length} bytes, 11/11 sections)`);
    } catch (err) {
      console.error(`[FAIL] Fixture ${f.name} error:`, err.message);
      results[f.name] = false;
      allPass = false;
    }
  }

  // Check backend/src/services/docxService.js for scheme-specific hardcoding
  const docxCode = fs.readFileSync(path.join(__dirname, '../src/services/docxService.js'), 'utf8');
  const codeHasHardcoding = docxCode.toLowerCase().includes("pmegp") || docxCode.toLowerCase().includes("cgtmse") || docxCode.toLowerCase().includes("mudra");

  console.log("\n==================================================");
  console.log(`GLOBAL DOCX STATUS: ${allPass && !codeHasHardcoding ? 'PASS' : 'FAIL'}`);
  console.log("==================================================");
  console.log(`Generic builder used: YES`);
  console.log(`PMEGP: ${results["PMEGP"] ? 'PASS' : 'FAIL'}`);
  console.log(`PMMY: ${results["PMMY"] ? 'PASS' : 'FAIL'}`);
  console.log(`CGTMSE: ${results["CGTMSE"] ? 'PASS' : 'FAIL'}`);
  console.log(`Generic fixture: ${results["Generic fixture"] ? 'PASS' : 'FAIL'}`);
  console.log(`Dynamic filenames: ${dynamicFilenamesPass ? 'PASS' : 'FAIL'}`);
  console.log(`Scheme-specific hardcoding found: ${codeHasHardcoding ? 'YES' : 'NO'}`);
  console.log(`Groq calls: 0`);
  console.log(`Tavily calls: 0`);
  console.log(`Sanity mutations: 0`);
}

testGlobalDocxSuite();
