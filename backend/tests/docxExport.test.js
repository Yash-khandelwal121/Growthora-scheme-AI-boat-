require('dotenv').config({ path: '.env' });
process.env.USE_MOCK_CONTENT = "true";

const fs = require('fs');
const JSZip = require('jszip');
const { generateDocx } = require('../src/services/docxService');
const { sanitizeFilename } = require('../src/utils/sanitizeFilename');
const mockArticleContent = require('../src/mocks/mockArticleContent');
const openaiConfig = require('../src/config/openai');
const geminiConfig = require('../src/config/gemini');
const anthropicConfig = require('../src/config/anthropic');

async function runTests() {
  console.log("Starting Phase 4 DOCX Export Tests...");
  
  // Dummy final article JSON
  const finalArticleJson = {
    mode: "mock",
    sourceResearchId: "test-uuid",
    seo: mockArticleContent.seo,
    article: mockArticleContent.article,
    sources: [{ url: "https://example.gov.in/mock-pmegp-portal", domain: "example.gov.in", authorityLevel: "official" }],
    audit: { score: 100, passed: true },
    schema: {
      schemaObject: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebSite" }]
      }
    }
  };

  // Ensure NO AI calls
  let paidClientInvoked = false;
  const oldGetOpenAI = openaiConfig.getOpenAIClient;
  const oldGetGemini = geminiConfig.getGeminiClient;
  const oldGetAnthropic = anthropicConfig.getAnthropicClient;

  openaiConfig.getOpenAIClient = () => { paidClientInvoked = true; return {}; };
  geminiConfig.getGeminiClient = () => { paidClientInvoked = true; return {}; };
  anthropicConfig.getAnthropicClient = () => { paidClientInvoked = true; return {}; };

  let buffer;
  try {
    buffer = await generateDocx(finalArticleJson);
  } finally {
    openaiConfig.getOpenAIClient = oldGetOpenAI;
    geminiConfig.getGeminiClient = oldGetGemini;
    anthropicConfig.getAnthropicClient = oldGetAnthropic;
  }

  let passCount = 0;
  const failed = [];

  const check = (desc, condition) => {
    if (condition) {
      console.log(`✅ PASSED: ${desc}`);
      passCount++;
    } else {
      console.error(`❌ FAILED: ${desc}`);
      failed.push(desc);
    }
  };

  check("Valid .docx generated (Buffer returned)", Buffer.isBuffer(buffer));
  check("File size > 0", buffer.length > 0);
  check("No AI API calls made", !paidClientInvoked);
  
  const filename = `${sanitizeFilename(finalArticleJson.seo.slug)}-SEO-AEO-GEO-Guide.docx`;
  check("Filename sanitized", filename === "pmegp-scheme-2026-SEO-AEO-GEO-Guide.docx");

  try {
    const zip = await JSZip.loadAsync(buffer);
    check("ZIP-based DOCX package opens", true);
    
    const docXml = zip.file("word/document.xml");
    check("word/document.xml exists", !!docXml);
    
    if (docXml) {
      const xmlString = await docXml.async("string");
      
      check("H1 text exists", xmlString.includes(mockArticleContent.article.h1.substring(0, 15)));
      check("Snippet exists", xmlString.includes(mockArticleContent.article.snippetAnswer.substring(0, 20)));
      
      const faqMatches = xmlString.match(/Q\d+\./g) || [];
      check("Exactly 15 FAQ questions exist", faqMatches.length === 15);
      
      const expectedMetaTitle = mockArticleContent.seo.metaTitle.replace("&", "&amp;");
      check("Meta title exists", xmlString.includes(expectedMetaTitle));
      check("Meta description exists", xmlString.includes(mockArticleContent.seo.metaDescription.substring(0, 20)));
      check("Slug exists", xmlString.includes(mockArticleContent.seo.slug));
      
      check("Benefits rendered", xmlString.includes("Substantial Subsidy"));
      check("Eligibility rendered", xmlString.includes("Above 18 years"));
      check("Documents rendered", xmlString.includes("Aadhaar Card"));
      check("Application steps rendered", xmlString.includes("Visit the official PMEGP portal"));
      check("Sources rendered", xmlString.includes("example.gov.in/mock-pmegp-portal"));
      check("JSON-LD appendix exists", xmlString.includes("WebSite"));
      
      check("Fake API keys do not appear", !xmlString.includes("sk-ant-") && !xmlString.includes("sk-proj-"));
      
      check("sourceResearchId preserved", xmlString.includes("test-uuid"));
      check("Mock warning appears in mock mode", xmlString.includes("DEVELOPMENT TEST DOCUMENT"));
      
      // Content Immutability
      check("Content Immutability: Meta title unchanged", xmlString.includes(expectedMetaTitle));
      check("Content immutability: Subsidy value unchanged", xmlString.includes("15% to 35%"));
    }
  } catch (err) {
    console.error("ZIP parsing error", err);
    check("ZIP-based DOCX package opens", false);
  }

  console.log(`\nTests Completed: ${passCount} Passed.`);
  if (failed.length > 0) {
    console.error("Failures:");
    console.error(failed);
  }
}

runTests();
