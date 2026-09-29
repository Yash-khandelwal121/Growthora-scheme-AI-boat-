const { Document, Packer, Paragraph, TextRun, HeadingLevel, Header, Footer, PageNumber, AlignmentType } = require('docx');
const styles = require('../utils/docxStyles');
const { createSimpleTable, createKeyValueTable } = require('../utils/docxHelpers');
const { formatRupee } = require('../utils/currencyFormatter');
const { detectSchemeType, getFinancialHeading } = require('../utils/contentNormalizer');

function sanitizeDocxText(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  // Remove XML 1.0 invalid control characters (\x00-\x08, \x0B, \x0C, \x0E-\x1F)
  const cleanStr = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return formatRupee(cleanStr);
}

function toDisplayText(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return sanitizeDocxText(String(val));
  }
  if (Array.isArray(val)) {
    return val.map(toDisplayText).filter(Boolean).join('; ');
  }
  if (typeof val === 'object') {
    const parts = [];
    if (val.title || val.category || val.heading) parts.push(val.title || val.category || val.heading);
    if (val.description || val.criteria || val.text) parts.push(val.description || val.criteria || val.text);
    if (val.document) parts.push(val.document + (val.purpose ? ` (${val.purpose})` : ''));
    if (parts.length > 0) return sanitizeDocxText(parts.join(': '));
    return sanitizeDocxText(JSON.stringify(val));
  }
  return sanitizeDocxText(String(val));
}

function renderNestedSubsections(sections, data, level = 2, customFinancialHeading = null) {
  if (!data) return;

  if (typeof data === 'string') {
    if (data.trim()) {
      sections.push(new Paragraph({ text: sanitizeDocxText(data) }));
      sections.push(new Paragraph({ text: "" }));
    }
    return;
  }

  if (Array.isArray(data)) {
    data.forEach(item => {
      if (typeof item === 'string') {
        sections.push(new Paragraph({ text: sanitizeDocxText(item), bullet: { level: 0 } }));
      } else if (typeof item === 'object' && item !== null) {
        if (item.heading || item.title || item.category) {
          sections.push(new Paragraph({ text: sanitizeDocxText(item.heading || item.title || item.category), style: `Heading${Math.min(level, 3)}` }));
        }
        
        let descParts = [];
        if (item.text) descParts.push(item.text);
        if (item.description) descParts.push(item.description);
        if (item.criteria) descParts.push(item.criteria);
        if (item.detail) descParts.push(item.detail);
        if (item.limit) descParts.push(`Limit: ${item.limit}`);
        if (item.lowerLimit && item.upperLimit) descParts.push(`Coverage: Above ${item.lowerLimit} and up to ${item.upperLimit}`);
        if (item.specialCondition) descParts.push(`Condition: ${item.specialCondition}`);
        if (item.condition) descParts.push(`Condition: ${item.condition}`);
        
        if (descParts.length > 0) {
          sections.push(new Paragraph({ text: sanitizeDocxText(descParts.join(' | ')) }));
        }
        sections.push(new Paragraph({ text: "" }));
      }
    });
    return;
  }

  if (typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (!val) continue;

      let formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();

      if (key === 'financialAssistance' || key === 'financial_assistance' || key === 'loanCategories' || key === 'subsidies') {
        if (customFinancialHeading) formattedKey = customFinancialHeading;
      }

      if (typeof val === 'string') {
        sections.push(new Paragraph({ text: sanitizeDocxText(formattedKey), style: `Heading${Math.min(level, 3)}` }));
        sections.push(new Paragraph({ text: sanitizeDocxText(val) }));
        sections.push(new Paragraph({ text: "" }));
      } else if (Array.isArray(val)) {
        sections.push(new Paragraph({ text: sanitizeDocxText(formattedKey), style: `Heading${Math.min(level, 3)}` }));
        val.forEach(item => {
          if (typeof item === 'string') {
            sections.push(new Paragraph({ text: sanitizeDocxText(item), bullet: { level: 0 } }));
          } else if (typeof item === 'object' && item !== null) {
            const cleanObj = {};
            for (const [k, v] of Object.entries(item)) {
              if (k !== 'sourceIds') {
                cleanObj[sanitizeDocxText(k)] = sanitizeDocxText(v);
              }
            }
            if (Object.keys(cleanObj).length > 0) {
              const itemStr = Object.entries(cleanObj).map(([k, v]) => `${k}: ${v}`).join(' | ');
              sections.push(new Paragraph({ text: itemStr, bullet: { level: 0 } }));
            }
          }
        });
        sections.push(new Paragraph({ text: "" }));
      } else if (typeof val === 'object') {
        sections.push(new Paragraph({ text: sanitizeDocxText(formattedKey), style: `Heading${Math.min(level, 3)}` }));
        const cleanGlance = {};
        for (const [k, v] of Object.entries(val)) {
          cleanGlance[sanitizeDocxText(k)] = sanitizeDocxText(v);
        }
        sections.push(createKeyValueTable(cleanGlance));
        sections.push(new Paragraph({ text: "" }));
      }
    }
  }
}

async function generateDocx(finalArticleJson) {
  if (!finalArticleJson || typeof finalArticleJson !== 'object') {
    throw new Error("DOCX_SECTION_MISSING: Invalid or missing final article JSON");
  }

  const { mode, seo = {}, article = {}, sources = [], schema } = finalArticleJson;
  const isMock = mode === "mock";

  const schemeType = finalArticleJson.schemeType || detectSchemeType(finalArticleJson);
  const financialHeading = finalArticleJson.financialHeading || getFinancialHeading(schemeType);

  // STRUCTURAL COMPLETENESS VALIDATOR (11 SECTIONS)
  const missingSections = [];

  const heroText = article.shortDescription || article.snippetAnswer;
  if (!heroText || String(heroText).trim() === "") {
    missingSections.push("shortDescription (Hero Section)");
  }

  const dd = article.detailedDescription;
  if (!dd || (typeof dd === 'string' && String(dd).trim() === "") || (typeof dd === 'object' && Object.keys(dd).length === 0)) {
    missingSections.push("detailedDescription");
  }

  const rawBenefits = article.keyBenefits || article.benefits || [];
  const benefitsList = (Array.isArray(rawBenefits) ? rawBenefits : []).filter(Boolean);
  if (benefitsList.length === 0) {
    missingSections.push("benefits");
  }

  let rawEligibility = article.eligibility || [];
  if (!Array.isArray(rawEligibility) && rawEligibility && Array.isArray(rawEligibility.criteria)) {
    rawEligibility = rawEligibility.criteria;
  }
  const eligibilityList = (Array.isArray(rawEligibility) ? rawEligibility : []).filter(Boolean);
  if (eligibilityList.length === 0) {
    missingSections.push("eligibility");
  }

  let rawDocs = article.documentsRequired || [];
  if (!Array.isArray(rawDocs) && article.documents && Array.isArray(article.documents.required)) {
    rawDocs = article.documents.required;
  }
  const docsList = (Array.isArray(rawDocs) ? rawDocs : []).filter(Boolean);
  if (docsList.length === 0) {
    missingSections.push("documents");
  }

  const faqsList = Array.isArray(article.faqs) ? article.faqs : [];
  if (faqsList.length === 0) {
    missingSections.push("faqs");
  }

  const conclusionText = article.conclusion;
  if (!conclusionText || String(conclusionText).trim() === "") {
    missingSections.push("conclusion");
  }

  const metaTitle = seo.metaTitle;
  if (!metaTitle || String(metaTitle).trim() === "") {
    missingSections.push("SEO title");
  }

  const metaDescription = seo.metaDescription;
  if (!metaDescription || String(metaDescription).trim() === "") {
    missingSections.push("SEO description");
  }

  let rawKeywords = [];
  if (seo.primaryKeyword) rawKeywords.push(seo.primaryKeyword);
  if (Array.isArray(seo.secondaryKeywords)) rawKeywords.push(...seo.secondaryKeywords);
  if (Array.isArray(seo.semanticKeywords)) rawKeywords.push(...seo.semanticKeywords);
  const uniqueKwSet = new Set(rawKeywords.map(k => String(k).trim()).filter(Boolean));
  if (uniqueKwSet.size === 0) {
    missingSections.push("SEO keywords");
  }

  const schemaObj = schema?.schemaObject || schema;
  if (!schemaObj || (typeof schemaObj === 'object' && Object.keys(schemaObj).length === 0)) {
    missingSections.push("Schema Markup (JSON-LD)");
  }

  if (missingSections.length > 0) {
    throw new Error(`DOCX_SECTION_MISSING: The following required sections are missing: ${missingSections.join(', ')}`);
  }

  // BUILD DOCUMENT SECTIONS IN EXACT ORDER (11 SECTIONS)
  const sections = [];

  if (isMock) {
    sections.push(new Paragraph({ style: "Warning", text: "DEVELOPMENT TEST DOCUMENT" }));
    sections.push(new Paragraph({
      style: "Warning",
      text: "This document was generated using mock research/content data. No live AI research provider was called."
    }));
    sections.push(new Paragraph({ text: "" }));
  }

  const documentTitle = article.h1 || finalArticleJson.researchSchemeName || "Scheme Guide";
  sections.push(new Paragraph({ text: sanitizeDocxText(documentTitle), style: "Title" }));
  sections.push(new Paragraph({ text: "" }));

  // 1. Short Description (Hero Section)
  sections.push(new Paragraph({ text: "Short Description (Hero Section)", style: "Heading1" }));
  sections.push(new Paragraph({ text: sanitizeDocxText(heroText), style: "Snippet" }));
  sections.push(new Paragraph({ text: "" }));

  // 2. Detailed Description
  sections.push(new Paragraph({ text: "Detailed Description", style: "Heading1" }));
  renderNestedSubsections(sections, dd, 2, financialHeading);

  // Additional detailed description subsections if outside dd
  if (article.financialAssistance && article.financialAssistance.length > 0 && (!dd || !dd.financialAssistance)) {
    sections.push(new Paragraph({ text: financialHeading, style: "Heading2" }));
    renderNestedSubsections(sections, article.financialAssistance, 3, financialHeading);
  }

  if (article.applicationProcess && article.applicationProcess.length > 0 && (!dd || !dd.applicationProcess)) {
    sections.push(new Paragraph({ text: "Application Process", style: "Heading2" }));
    article.applicationProcess.forEach(a => {
      sections.push(new Paragraph({ text: sanitizeDocxText(String(a)), numbering: { reference: "numbered", level: 0 } }));
    });
    sections.push(new Paragraph({ text: "" }));
  }

  if (article.importantDates && article.importantDates.length > 0 && (!dd || !dd.importantDates)) {
    sections.push(new Paragraph({ text: "Important Dates", style: "Heading2" }));
    renderNestedSubsections(sections, article.importantDates, 3);
  }

  if (article.mistakesToAvoid && article.mistakesToAvoid.length > 0 && (!dd || !dd.mistakesToAvoid)) {
    sections.push(new Paragraph({ text: "Important Considerations & Mistakes to Avoid", style: "Heading2" }));
    article.mistakesToAvoid.forEach(m => {
      sections.push(new Paragraph({ text: sanitizeDocxText(String(m)), bullet: { level: 0 } }));
    });
    sections.push(new Paragraph({ text: "" }));
  }

  // 3. Benefits
  sections.push(new Paragraph({ text: "Benefits", style: "Heading1" }));
  benefitsList.slice(0, 5).forEach(b => {
    let formattedStr = "";
    if (typeof b === 'string') {
      formattedStr = b;
    } else if (typeof b === 'object' && b !== null) {
      formattedStr = b.title ? `${b.title}: ${b.description || ''}` : (b.description || '');
    }
    sections.push(new Paragraph({ text: sanitizeDocxText(formattedStr), bullet: { level: 0 } }));
  });
  if (benefitsList.length < 5) {
    sections.push(new Paragraph({ text: "Note: Only verified benefits available from retrieved official evidence are listed above.", style: "Caption" }));
  }
  sections.push(new Paragraph({ text: "" }));

  // 4. Eligibility Criteria
  sections.push(new Paragraph({ text: "Eligibility Criteria", style: "Heading1" }));
  eligibilityList.slice(0, 5).forEach(e => {
    let formattedStr = "";
    if (typeof e === 'string') {
      formattedStr = e;
    } else if (typeof e === 'object' && e !== null) {
      formattedStr = e.category ? `${e.category}: ${e.criteria || ''}` : (e.criteria || '');
    }
    sections.push(new Paragraph({ text: sanitizeDocxText(formattedStr), bullet: { level: 0 } }));
  });
  if (eligibilityList.length < 5) {
    sections.push(new Paragraph({ text: "Note: Only verified eligibility criteria available from retrieved official evidence are listed above.", style: "Caption" }));
  }
  sections.push(new Paragraph({ text: "" }));

  // 5. Documents Required
  sections.push(new Paragraph({ text: "Documents Required", style: "Heading1" }));
  docsList.slice(0, 5).forEach(d => {
    let formattedStr = "";
    if (typeof d === 'string') {
      formattedStr = d;
    } else if (typeof d === 'object' && d !== null) {
      formattedStr = d.document ? `${d.document}${d.purpose ? ` (${d.purpose})` : ''}` : (d.purpose || '');
    }
    sections.push(new Paragraph({ text: sanitizeDocxText(formattedStr), bullet: { level: 0 } }));
  });
  if (docsList.length < 5) {
    sections.push(new Paragraph({ text: "Note: Only verified document requirements available from retrieved official evidence are listed above.", style: "Caption" }));
  }
  sections.push(new Paragraph({ text: "" }));

  // 6. Frequently Asked Questions
  sections.push(new Paragraph({ text: "Frequently Asked Questions", style: "Heading1", pageBreakBefore: true }));
  faqsList.slice(0, 15).forEach((f, idx) => {
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: `Q${idx + 1}. ${sanitizeDocxText(f.question)}`, bold: true })
      ],
      style: "Heading3"
    }));
    sections.push(new Paragraph({ text: "Answer:", bold: true }));
    sections.push(new Paragraph({ text: sanitizeDocxText(f.answer) }));
    sections.push(new Paragraph({ text: "" }));
  });

  // 7. Conclusion
  sections.push(new Paragraph({ text: "Conclusion", style: "Heading1" }));
  let formattedConclusion = String(conclusionText);
  if (!/growthora/i.test(formattedConclusion)) {
    formattedConclusion += " For assistance with eligibility assessment, documentation or scheme application planning, you can consult Growthora.";
  }
  sections.push(new Paragraph({ text: sanitizeDocxText(formattedConclusion) }));
  sections.push(new Paragraph({ text: "" }));

  // 8. SEO Title
  sections.push(new Paragraph({ text: "SEO Title", style: "Heading1" }));
  sections.push(new Paragraph({ text: sanitizeDocxText(metaTitle) }));
  sections.push(new Paragraph({ text: `Character Count: ${metaTitle.length}` }));
  sections.push(new Paragraph({ text: "" }));

  // 9. SEO Description
  sections.push(new Paragraph({ text: "SEO Description", style: "Heading1" }));
  sections.push(new Paragraph({ text: sanitizeDocxText(metaDescription) }));
  sections.push(new Paragraph({ text: `Character Count: ${metaDescription.length}` }));
  sections.push(new Paragraph({ text: "" }));

  // 10. SEO Keywords
  sections.push(new Paragraph({ text: "SEO Keywords", style: "Heading1" }));
  const finalKeywords = Array.from(uniqueKwSet).slice(0, 20);
  finalKeywords.forEach((kw, idx) => {
    sections.push(new Paragraph({ text: `${idx + 1}. ${sanitizeDocxText(kw)}` }));
  });
  sections.push(new Paragraph({ text: "" }));

  // 11. Schema Markup (JSON-LD)
  sections.push(new Paragraph({ text: "Schema Markup (JSON-LD)", style: "Heading1", pageBreakBefore: true }));
  const schemaStr = sanitizeDocxText(JSON.stringify(schemaObj, null, 2));
  schemaStr.split('\n').forEach(l => {
    sections.push(new Paragraph({ text: l, style: "Code" }));
  });

  // Create document
  const doc = new Document({
    creator: "Growthora Advisory Private Limited",
    title: sanitizeDocxText(documentTitle),
    subject: "Government Scheme Guide",
    keywords: finalKeywords.join(', '),
    styles: styles,
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1150, bottom: 1150, left: 1150, right: 1150 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.BETWEEN,
                children: [
                  new TextRun({ text: "Growthora Advisory Private Limited", color: "888888" }),
                  new TextRun({ text: "Scheme Guide", color: "888888" })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.BETWEEN,
                children: [
                  new TextRun({ text: "growthora.co.in", color: "888888" }),
                  new TextRun({ text: "\tPage ", color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "888888" })
                ]
              })
            ]
          })
        },
        children: sections
      }
    ]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateDocx };
