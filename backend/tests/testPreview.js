async function test() {
  const researchBody = {
    schemeName: "PMEGP",
    primaryKeyword: "PMEGP Scheme 2026",
    secondaryKeywords: ["PMEGP eligibility"],
    location: "India",
    outcome: "Complete Scheme Guide",
    language: "English"
  };

  const rRes = await fetch('http://localhost:5000/api/schemes/research', {
    method: 'POST', body: JSON.stringify(researchBody), headers: {'Content-Type': 'application/json'}
  }).then(r => r.json());

  const cRes = await fetch('http://localhost:5000/api/schemes/content', {
    method: 'POST', body: JSON.stringify({ research: rRes.data }), headers: {'Content-Type': 'application/json'}
  }).then(r => r.json());

  const pRes = await fetch('http://localhost:5000/api/sanity/preview', {
    method: 'POST', body: JSON.stringify({ content: cRes.data, categoryId: 'cat-general' }), headers: {'Content-Type': 'application/json'}
  }).then(r => r.json());

  console.log("preview name: " + pRes.document.name);
  console.log("preview seoTitle: " + pRes.document.seoTitle);
  console.log("preview slug: " + pRes.document.slug.current);
  console.log("FAQ count: " + pRes.mappingSummary.faqCount);
}

test().catch(console.error);
