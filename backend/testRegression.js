require('dotenv').config();
const { runGroqContentWriter } = require('./src/agents/groqContentWriterAgent');
const { generateArticle } = require('./src/services/contentService');
const { getGroqClient } = require('./src/config/groq');

async function runTests() {
  console.log('--- RUNNING REGRESSION TESTS ---');
  let passCount = 0;
  
  // MOCK GROQ CLIENT FOR TESTS
  const originalCreate = getGroqClient().chat.completions.create;

  // TEST A: PMEGP slug test
  getGroqClient().chat.completions.create = async (cfg) => ({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
      article: {
        snippetAnswer: 'Test', detailedDescription: 'Test', conclusion: 'Test',
        keyBenefits: [{title: 'A'}], eligibility: [{criteria: 'A'}], documentsRequired: [{document: 'A'}], faqs: [{question: 'A'}]
      },
      seo: { slug: 'pmegp-scheme-2026', canonicalPath: 'https://growthora.co.in/govtschemes/pmegp-scheme-2026' }
    })}}]
  });
  try {
    let res = await runGroqContentWriter({ scheme: { name: 'PMEGP' } });
    if (res.seo.slug.includes('pmegp')) {
      console.log('TEST A PASS: PMEGP slug test');
      passCount++;
    } else {
      console.log('TEST A FAIL');
    }
  } catch(e) { console.log('TEST A FAIL', e.message); }

  // TEST B: PMMY no-PMEGP slug test
  getGroqClient().chat.completions.create = async (cfg) => ({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
      article: {
        snippetAnswer: 'Test', detailedDescription: 'Test', conclusion: 'Test',
        keyBenefits: [{title: 'A'}], eligibility: [{criteria: 'A'}], documentsRequired: [{document: 'A'}], faqs: [{question: 'A'}]
      },
      seo: { slug: 'mudra-loan-scheme', canonicalPath: 'https://growthora.co.in/govtschemes/mudra-loan-scheme' }
    })}}]
  });
  try {
    let res = await runGroqContentWriter({ scheme: { name: 'Pradhan Mantri Mudra Yojana' } });
    if (!res.seo.slug.includes('pmegp') && res.seo.slug.includes('mudra')) {
      console.log('TEST B PASS: PMMY no-PMEGP slug test');
      passCount++;
    } else {
      console.log('TEST B FAIL');
    }
  } catch(e) { console.log('TEST B FAIL', e.message); }

  // TEST C: Arbitrary scheme test
  getGroqClient().chat.completions.create = async (cfg) => ({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
      article: {
        snippetAnswer: 'Test', detailedDescription: 'Test', conclusion: 'Test',
        keyBenefits: [{title: 'A'}], eligibility: [{criteria: 'A'}], documentsRequired: [{document: 'A'}], faqs: [{question: 'A'}]
      },
      seo: { slug: 'national-example-support', canonicalPath: 'https://growthora.co.in/govtschemes/national-example-support' }
    })}}]
  });
  try {
    let res = await runGroqContentWriter({ scheme: { name: 'National Example Support Scheme' } });
    if (!res.seo.slug.includes('pmegp')) {
      console.log('TEST C PASS: Arbitrary scheme test');
      passCount++;
    } else {
      console.log('TEST C FAIL');
    }
  } catch(e) { console.log('TEST C FAIL', e.message); }

  // TEST D: Missing benefits test
  getGroqClient().chat.completions.create = async (cfg) => ({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
      article: {
        snippetAnswer: 'Test', detailedDescription: 'Test', conclusion: 'Test',
        eligibility: [{criteria: 'A'}], documentsRequired: [{document: 'A'}], faqs: [{question: 'A'}]
      }, // Missing keyBenefits
      seo: { slug: 'test', canonicalPath: 'test' }
    })}}]
  });
  try {
    await runGroqContentWriter({ scheme: { name: 'Test' } });
    console.log('TEST D FAIL: Did not throw on missing benefits');
  } catch(e) {
    if (e.message.includes('Missing or empty keyBenefits')) {
      console.log('TEST D PASS: Missing benefits test');
      passCount++;
    } else {
      console.log('TEST D FAIL:', e.message);
    }
  }

  // TEST E: Truncation fallback test
  let calls = 0;
  getGroqClient().chat.completions.create = async (cfg) => {
    calls++;
    if (calls === 1) return { choices: [{ finish_reason: 'length', message: { content: '{\"article\": {\"snippet' } }] };
    return {
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
        article: {
          snippetAnswer: 'Test', detailedDescription: 'Test', conclusion: 'Test',
          keyBenefits: [{title: 'A'}], eligibility: [{criteria: 'A'}], documentsRequired: [{document: 'A'}], faqs: [{question: 'A'}]
        },
        seo: { slug: 'test', canonicalPath: 'test' }
      })}}]
    };
  };
  try {
    await runGroqContentWriter({ scheme: { name: 'Test' } });
    if (calls > 1) {
      console.log('TEST E PASS: Truncation fallback test (Calls: ' + calls + ')');
      passCount++;
    } else {
      console.log('TEST E FAIL: Fallback not triggered');
    }
  } catch(e) { console.log('TEST E FAIL', e.message); }

  // TEST F: Zero official sources test
  try {
    const fakeResearch = { researchId: 'fake123', sources: [{ authorityLevel: 'low', authorityScore: 10 }] };
    let res = await generateArticle(fakeResearch);
    if (res.success === false && res.publishReadiness === 'blocked' && res.errorCategory === 'INSUFFICIENT_OFFICIAL_EVIDENCE') {
      console.log('TEST F PASS: Zero official sources test');
      passCount++;
    } else {
      console.log('TEST F FAIL');
    }
  } catch(e) { console.log('TEST F FAIL', e.message); }

  console.log('====================================');
  console.log('FIX STATUS: ' + (passCount === 6 ? 'PASS' : 'FAIL'));
}

runTests();
