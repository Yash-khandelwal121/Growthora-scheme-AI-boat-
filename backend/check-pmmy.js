const fs = require('fs');

function checkPMMY() {
  const masterResearch = JSON.parse(fs.readFileSync('./data/research-cache/mudra-loan-scheme-2026.master-research.json', 'utf8'));
  console.log(JSON.stringify(masterResearch.financialAssistance, null, 2));
  console.log(JSON.stringify(masterResearch.eligibility, null, 2));
}

checkPMMY();
