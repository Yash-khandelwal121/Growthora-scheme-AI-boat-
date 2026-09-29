const { parseAIJson } = require('./src/utils/parseAIJson');
const { validateAndParseJson } = require('./src/agents/groqContentWriterAgent');

function mockValidate(jsonObj) {
  // Mock the parts of validateAndParseJson that we care about
  const { snippetAnswer, detailedDescription, keyBenefits, eligibility, documentsRequired, faqs, conclusion } = jsonObj.article || {};
  if (!detailedDescription) throw new Error('Missing detailedDescription.');
  if (!Array.isArray(keyBenefits) || keyBenefits.length === 0) throw new Error('Missing or empty keyBenefits array.');
  if (!Array.isArray(faqs) || faqs.length === 0) throw new Error('Missing or empty faqs array.');
  return jsonObj;
}

let passes = 0;

try {
  const jsonStr = JSON.stringify({
    article: {
      detailedDescription: { introduction: "hello" },
      keyBenefits: [{title: "a", description: "b"}],
      faqs: [{question: "q", answer: "a"}]
    }
  });
  const parsed = parseAIJson(jsonStr);
  mockValidate(parsed);
  console.log("TEST A: Valid detailedDescription -> PASS");
  passes++;
} catch (e) {
  console.log("TEST A FAIL", e.message);
}

try {
  const jsonStr = JSON.stringify({
    article: {
      detailed_description: { introduction: "hello" },
      keyBenefits: [{title: "a", description: "b"}],
      faqs: [{question: "q", answer: "a"}]
    }
  });
  const parsed = parseAIJson(jsonStr);
  mockValidate(parsed);
  console.log("TEST B: Legacy alias -> PASS");
  passes++;
} catch (e) {
  console.log("TEST B FAIL", e.message);
}

try {
  const jsonStr = JSON.stringify({
    article: {
      keyBenefits: [{title: "a", description: "b"}],
      faqs: [{question: "q", answer: "a"}]
    }
  });
  const parsed = parseAIJson(jsonStr);
  mockValidate(parsed);
  console.log("TEST C FAIL (Should have rejected)");
} catch (e) {
  if (e.message.includes('Missing detailedDescription')) {
    console.log("TEST C: Missing detailedDescription rejection -> PASS");
    passes++;
  } else {
    console.log("TEST C FAIL", e.message);
  }
}

try {
  const jsonStr = JSON.stringify({
    article: {
      detailedDescription: { introduction: "hello" },
      faqs: [{question: "q", answer: "a"}]
    }
  });
  const parsed = parseAIJson(jsonStr);
  mockValidate(parsed);
  console.log("TEST D FAIL (Should have rejected)");
} catch (e) {
  if (e.message.includes('Missing or empty keyBenefits')) {
    console.log("TEST D: Missing arrays rejection -> PASS");
    passes++;
  } else {
    console.log("TEST D FAIL", e.message);
  }
}

try {
  const jsonStr = JSON.stringify({
    article: {
      detailedDescription: { introduction: "hello" },
      keyBenefits: [{title: "a", description: "b"}],
      eligibility: [{criteria: "c"}],
      documentsRequired: [{document: "d"}],
      faqs: [{question: "q", answer: "a"}],
      conclusion: "bye"
    }
  });
  const parsed = parseAIJson(jsonStr);
  mockValidate(parsed);
  console.log("TEST E: Valid complete article -> PASS");
  passes++;
} catch (e) {
  console.log("TEST E FAIL", e.message);
}

console.log("Total Passes:", passes);
