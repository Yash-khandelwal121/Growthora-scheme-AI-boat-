const { analyzeSourceAuthority } = require('../src/utils/sourceAuthority');

function runTests() {
  console.log("Testing sourceAuthority.js...");
  
  const testCases = [
    { url: 'https://myscheme.gov.in/scheme/123', expected: 'government_portal' },
    { url: 'https://some-ministry.nic.in/docs', expected: 'official_government' },
    { url: 'https://www.cleartax.in/s/pmegp', expected: 'trusted_secondary' },
    { url: 'https://randomblog.com/scheme', expected: 'unknown' },
    { url: 'not-a-url', expected: 'invalid_url' }
  ];

  let passed = 0;
  testCases.forEach((tc) => {
    const res = analyzeSourceAuthority(tc.url);
    if (res.authorityLevel === tc.expected) {
      passed++;
      console.log("✅ " + tc.url + " -> " + tc.expected);
    } else {
      console.error("❌ " + tc.url + " -> Expected " + tc.expected + ", got " + res.authorityLevel);
    }
  });
  
  console.log("Passed " + passed + "/" + testCases.length + " tests.\n");
}

runTests();
