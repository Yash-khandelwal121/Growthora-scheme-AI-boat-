function generateKey() {
  return Math.random().toString(36).substring(2, 9);
}

function createSpan(text, marks = []) {
  return {
    _type: 'span',
    _key: generateKey(),
    text: String(text || ''),
    marks
  };
}

function createBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: generateKey(),
    style: style,
    children: [createSpan(text)],
    markDefs: []
  };
}

function createBullet(text, level = 1) {
  return {
    _type: 'block',
    _key: generateKey(),
    style: 'normal',
    listItem: 'bullet',
    level,
    children: [createSpan(text)],
    markDefs: []
  };
}

function createNumber(text, level = 1) {
  return {
    _type: 'block',
    _key: generateKey(),
    style: 'normal',
    listItem: 'number',
    level,
    children: [createSpan(text)],
    markDefs: []
  };
}

function buildDetailedDescription(article) {
  const pt = [];
  
  const dd = article.detailedDescription || article;
  
  if (dd.introduction) {
    pt.push(createBlock("Introduction", "h2"));
    pt.push(createBlock(dd.introduction));
  }
  
  if (dd.whatIsScheme) {
    pt.push(createBlock("What Is the Scheme?", "h2"));
    pt.push(createBlock(dd.whatIsScheme));
  }
  
  if (dd.detailedExplanation && Array.isArray(dd.detailedExplanation)) {
    pt.push(createBlock("Detailed Explanation", "h2"));
    dd.detailedExplanation.forEach(b => {
      if (b.heading) pt.push(createBlock(b.heading, "h3"));
      if (b.text) pt.push(createBlock(b.text));
    });
  }
  
  if (article.financialAssistance && Array.isArray(article.financialAssistance)) {
    pt.push(createBlock("Financial Assistance", "h2"));
    article.financialAssistance.forEach(f => {
      let str = [];
      Object.entries(f).forEach(([k, v]) => {
        if (k !== 'sourceIds' && v) str.push(`${k}: ${v}`);
      });
      pt.push(createBullet(str.join(" | ")));
    });
  }
  
  if (article.applicationProcess && Array.isArray(article.applicationProcess)) {
    pt.push(createBlock("Application Process", "h2"));
    article.applicationProcess.forEach(a => {
      pt.push(createNumber(a));
    });
  }
  
  if (article.importantDates && Array.isArray(article.importantDates)) {
    pt.push(createBlock("Important Dates", "h2"));
    article.importantDates.forEach(d => {
      let str = [];
      Object.entries(d).forEach(([k, v]) => {
        if (v) str.push(`${k}: ${v}`);
      });
      pt.push(createBullet(str.join(" | ")));
    });
  }
  
  if (article.mistakesToAvoid && Array.isArray(article.mistakesToAvoid)) {
    pt.push(createBlock("Mistakes to Avoid", "h2"));
    article.mistakesToAvoid.forEach(m => {
      pt.push(createBullet(m));
    });
  }
  
  if (article.conclusion) {
    pt.push(createBlock("Conclusion", "h2"));
    pt.push(createBlock(article.conclusion));
  }
  
  // Ensure we always return at least one block to be valid portable text
  if (pt.length === 0) {
    pt.push(createBlock(''));
  }
  
  return pt;
}

function buildBenefits(benefits) {
  const pt = [];
  if (Array.isArray(benefits)) {
    benefits.forEach(b => {
      if (b.title && b.description) {
        pt.push(createBullet(`**${b.title}**: ${b.description}`)); // Simple markdown emphasis syntax inside text, marks processing can be complex
      } else if (b.description) {
        pt.push(createBullet(b.description));
      }
    });
  }
  
  if (pt.length === 0) pt.push(createBlock(''));
  return pt;
}

function buildEligibility(eligibility) {
  const pt = [];
  if (Array.isArray(eligibility)) {
    eligibility.forEach(e => {
      if (e.category && e.criteria) {
        pt.push(createBullet(`${e.category}: ${e.criteria}`));
      } else if (e.criteria) {
        pt.push(createBullet(e.criteria));
      }
    });
  }
  if (pt.length === 0) pt.push(createBlock(''));
  return pt;
}

function buildDocumentsRequired(documents) {
  const pt = [];
  if (Array.isArray(documents)) {
    documents.forEach(d => {
      if (d.document) {
        let text = `${d.document}`;
        if (d.purpose) text += `\nPurpose: ${d.purpose}`;
        if (d.requirementStatus) text += `\nStatus: ${d.requirementStatus}`;
        pt.push(createBullet(text));
      }
    });
  }
  if (pt.length === 0) pt.push(createBlock(''));
  return pt;
}

function buildFAQs(faqs) {
  // Returns array of faq objects as per schemePage structure, not portable text
  const result = [];
  if (Array.isArray(faqs)) {
    // Only take exactly 15 if available, or all if less
    const limit = Math.min(faqs.length, 15);
    for (let i = 0; i < limit; i++) {
      const f = faqs[i];
      if (f.question && f.answer) {
        result.push({
          _key: generateKey(),
          question: f.question,
          answer: f.answer
        });
      }
    }
  }
  return result;
}

module.exports = {
  buildDetailedDescription,
  buildBenefits,
  buildEligibility,
  buildDocumentsRequired,
  buildFAQs,
  createBlock,
  createSpan
};
