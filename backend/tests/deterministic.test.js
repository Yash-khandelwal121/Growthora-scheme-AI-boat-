const { categorizeProviderError } = require('../src/utils/providerErrorCategories');

function runTests() {
  console.log("Testing providerErrorCategories.js...");
  
  const testCases = [
    { error: { status: 401 }, expected: 'authentication_failed' },
    { error: { status: 403 }, expected: 'authentication_failed' },
    { error: { status: 402 }, expected: 'billing_required' },
    { error: { status: 429, message: 'quota exceeded' }, expected: 'billing_required' },
    { error: { status: 429, message: 'You have no credits remaining.' }, expected: 'billing_required' },
    { error: { status: 400, message: 'Your credit balance is too low' }, expected: 'billing_required' },
    { error: { status: 404 }, expected: 'model_unavailable' },
    { error: { status: 429, message: 'too many requests' }, expected: 'rate_limited' },
    { error: { status: 503 }, expected: 'temporary_unavailable' },
    { error: { message: 'high demand' }, expected: 'temporary_unavailable' },
    { error: { status: 500 }, expected: 'unknown_provider_error' },
  ];

  let passed = 0;
  testCases.forEach((tc, idx) => {
    const res = categorizeProviderError(tc.error, 'TestProvider');
    if (res === tc.expected) {
      passed++;
      console.log("✅ Test " + (idx + 1) + " passed (" + tc.expected + ")");
    } else {
      console.error("❌ Test " + (idx + 1) + " failed. Expected " + tc.expected + " but got " + res);
    }
  });
  
  console.log("Passed " + passed + "/" + testCases.length + " tests.\n");
}

runTests();
