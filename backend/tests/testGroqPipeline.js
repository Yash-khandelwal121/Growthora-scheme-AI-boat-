async function run() {
  // 1. Get Status
  const statusRes = await fetch('http://localhost:5000/api/providers/status').then(r => r.json());
  console.log("Status:", JSON.stringify(statusRes, null, 2));

  // 2. Groq Test
  const groqTestRes = await fetch('http://localhost:5000/api/providers/groq-test').then(r => r.json());
  console.log("Groq Test:", JSON.stringify(groqTestRes, null, 2));

  // 3. E2E API
  const researchBody = {
    schemeName: "PMEGP",
    primaryKeyword: "PMEGP Scheme 2026",
    secondaryKeywords: ["PMEGP eligibility"],
    location: "India",
    outcome: "Complete Scheme Guide",
    language: "English"
  };

  console.log("Running Research...");
  const rRes = await fetch('http://localhost:5000/api/schemes/research', {
    method: 'POST', body: JSON.stringify(researchBody), headers: {'Content-Type': 'application/json'}
  }).then(r => r.json());
  
  console.log("Research Result mode:", rRes.data?.mode);
  console.log("Research Result provider:", rRes.data?.provider);
  console.log("Research Result sources:", rRes.data?.sources);
  
  if (!rRes.success) {
    console.error("Research failed", rRes);
    return;
  }

  console.log("Running Content...");
  const cRes = await fetch('http://localhost:5000/api/schemes/content', {
    method: 'POST', body: JSON.stringify({ research: rRes.data }), headers: {'Content-Type': 'application/json'}
  }).then(r => r.json());
  
  console.log("Content Result FAQs:", cRes.data?.article?.faqs?.length);
  console.log("Content Result mode:", cRes.data?.mode);
  console.log("Content Result h1:", cRes.data?.article?.h1);
  
  if (!cRes.success) {
    console.error("Content failed", cRes);
    return;
  }
}

run().catch(console.error);
