const { parseAIJson } = require('../src/utils/parseAIJson');

function runTests() {
  console.log("Testing parseAIJson.js...");
  
  const testCases = [
    { input: '{"a": 1}', expectedValid: true },
    { input: '```json\n{"a": 1}\n```', expectedValid: true },
    { input: 'invalid json', expectedValid: false }
  ];

  let passed = 0;
  testCases.forEach((tc, idx) => {
    try {
      const res = parseAIJson(tc.input);
      if (tc.expectedValid && res && res.a === 1) {
        passed++;
        console.log("✅ Test " + (idx + 1) + " passed");
      } else if (!tc.expectedValid) {
        console.error("❌ Test " + (idx + 1) + " failed, expected invalid");
      }
    } catch (e) {
      if (!tc.expectedValid) {
        passed++;
        console.log("✅ Test " + (idx + 1) + " correctly rejected invalid JSON");
      } else {
        console.error("❌ Test " + (idx + 1) + " failed parsing valid JSON");
      }
    }
  });
  
  console.log("Passed " + passed + "/" + testCases.length + " tests.\n");
}

runTests();
