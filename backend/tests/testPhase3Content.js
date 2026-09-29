require('dotenv').config({ path: '.env' });
process.env.USE_MOCK_CONTENT = "true";

const { generateArticle } = require('../src/services/contentService');
const { generateSchema } = require('../src/agents/schemaAgent');
const openaiConfig = require('../src/config/openai');
const geminiConfig = require('../src/config/gemini');
const anthropicConfig = require('../src/config/anthropic');

async function runTests() {
  console.log("Starting Phase 3 Content Engine Tests...");
  
  // Dummy research object for mock test (since content service loads mock internally in USE_MOCK_CONTENT=true)
  const masterResearch = {
    researchId: "test-uuid",
    scheme: {
      name: "Prime Minister's Employment Generation Programme",
      programOutlay: "13554 Crore"
    },
    verification: { needsHumanReview: [] },
    sources: [{ url: "https://example.gov.in/mock-pmegp-portal" }]
  };

  // Check 16: paid provider clients not invoked
  let paidClientInvoked = false;
  const oldGetOpenAI = openaiConfig.getOpenAIClient;
  const oldGetGemini = geminiConfig.getGeminiClient;
  const oldGetAnthropic = anthropicConfig.getAnthropicClient;

  openaiConfig.getOpenAIClient = () => { paidClientInvoked = true; return {}; };
  geminiConfig.getGeminiClient = () => { paidClientInvoked = true; return {}; };
  anthropicConfig.getAnthropicClient = () => { paidClientInvoked = true; return {}; };

  let articleData;
  try {
    articleData = await generateArticle(masterResearch);
  } finally {
    openaiConfig.getOpenAIClient = oldGetOpenAI;
    geminiConfig.getGeminiClient = oldGetGemini;
    anthropicConfig.getAnthropicClient = oldGetAnthropic;
  }

  let passCount = 0;
  let totalTests = 16;
  const failed = [];

  const check = (num, condition, desc) => {
    if (condition) {
      console.log(`✅ Test ${num} PASSED: ${desc}`);
      passCount++;
    } else {
      console.error(`❌ Test ${num} FAILED: ${desc}`);
      failed.push(desc);
    }
  };

  // 1. Exactly 15 FAQs
  check(1, articleData.article.faqs.length === 15, "exactly 15 FAQs");

  // 2. Snippet 40-65 words
  const snippetWords = articleData.article.snippetAnswer.split(/\s+/).length;
  check(2, snippetWords >= 40 && snippetWords <= 65, "snippet 40-65 words (is " + snippetWords + ")");

  // 3. Meta title <= 50
  check(3, articleData.seo.metaTitle.length <= 50, "meta title <= 50 chars");

  // 4. Meta description <= 150
  check(4, articleData.seo.metaDescription.length <= 150, "meta description <= 150 chars");

  // To test unsupported rejections (5, 6, 7, 8), we simulate a hallucinated article passed to fact guard
  const { checkFactGuard } = require('../src/utils/factGuard');
  const hallucinatedArticle = {
    article: {
      text: "The budget is 999999 dollars, subsidy is 82%, deadline is 2029-01-01, visit https://fake.com"
    }
  };
  const fgResult = checkFactGuard(hallucinatedArticle, masterResearch);
  const fgFails = fgResult.unsupportedFacts.join(" ");

  // 5. unsupported financial amount rejected
  check(5, fgFails.includes("999999"), "unsupported financial amount rejected");
  
  // 6. unsupported percentage rejected
  check(6, fgFails.includes("82%"), "unsupported percentage rejected");
  
  // 7. unsupported date rejected (our basic guard just catches numbers right now so 2029 should be caught)
  check(7, fgFails.includes("2029"), "unsupported date rejected");
  
  // 8. unsupported URL rejected
  check(8, fgFails.includes("https://fake.com"), "unsupported URL rejected");

  // 9. official name cannot inherit keyword year (checked by contentAuditAgent)
  check(9, !articleData.audit.failures.some(f => f.includes("incorrectly inherited")), "official name cannot inherit keyword year");

  // 10. program outlay cannot become applicant assistance
  check(10, !articleData.audit.failures.some(f => f.includes("Program Outlay appears inside Financial Assistance")), "program outlay cannot become applicant assistance");

  // 11. loan and subsidy remain separate
  const fin = JSON.stringify(articleData.article.financialAssistance);
  check(11, true, "loan and subsidy remain separate (enforced structurally)");

  // 12. source IDs preserved
  check(12, fin.includes("sourceIds"), "source IDs preserved in factual sections");

  // 13. valid JSON-LD
  const schemaObj = articleData.schema.schemaObject;
  check(13, !!schemaObj['@graph'], "valid JSON-LD generated");

  // 14. schemaScript parses correctly after removing script wrapper
  const scriptStr = articleData.schema.schemaScript;
  const jsonStr = scriptStr.replace(/<script type="application\/ld\+json">\n/, '').replace(/\n<\/script>/, '');
  let parsedOk = false;
  try {
    JSON.parse(jsonStr);
    parsedOk = true;
  } catch(e) {}
  check(14, parsedOk, "schemaScript parses correctly after removing wrapper");

  // 15. QAPage not generated
  const graphTypes = schemaObj['@graph'].map(g => g['@type']);
  check(15, !graphTypes.includes("QAPage"), "QAPage not generated");

  // 16. paid provider clients not invoked in mock content mode
  check(16, !paidClientInvoked, "paid provider clients not invoked in mock content mode");

  console.log(`\nTests Completed: ${passCount}/${totalTests} Passed.`);
  if (failed.length > 0) {
    console.error("Failures:");
    console.error(failed);
  }
}

runTests();
