
const fs = require('fs');
const { calculateCriticalFactCoverage } = require('./src/utils/criticalFactCoverage');

// Mock enforceSupportedBy
const enforceSupportedBy = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach(k => {
    if (obj[k] && typeof obj[k] === 'object' && 'supportedBy' in obj[k]) {
      if ('value' in obj[k] && obj[k].value && (!Array.isArray(obj[k].supportedBy) || obj[k].supportedBy.length === 0)) {
        obj[k].value = null; 
      }
      if ('officialName' in obj[k] && obj[k].officialName && (!Array.isArray(obj[k].supportedBy) || obj[k].supportedBy.length === 0)) {
        obj[k].officialName = null; 
      }
    }
    if (obj[k] && typeof obj[k] === 'object' && 'sourceIds' in obj[k]) {
      if (('steps' in obj[k] && obj[k].steps && obj[k].steps.length > 0) || ('name' in obj[k] && obj[k].name)) {
        if (!Array.isArray(obj[k].sourceIds) || obj[k].sourceIds.length === 0) {
          if ('steps' in obj[k]) obj[k].steps = [];
          if ('type' in obj[k]) obj[k].type = null;
        }
      }
    }
    if (obj[k] && typeof obj[k] === 'object') {
      enforceSupportedBy(obj[k]);
    }
  });
};

const data = JSON.parse(fs.readFileSync('./data/research-cache/nidhi-prayas-scheme-2026.master-research.json', 'utf8'));
enforceSupportedBy(data);

const coverage = calculateCriticalFactCoverage(data);
console.log(JSON.stringify(coverage, null, 2));

