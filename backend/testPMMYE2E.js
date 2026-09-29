require('dotenv').config();
process.env.SANITY_WRITE_ENABLED = 'false';

const { performResearch } = require('./src/services/researchService');
const { generateArticle } = require('./src/services/contentService');
const { generateDocx } = require('./src/services/docxService');
const sanityService = require('./src/services/sanityService');
const fs = require('fs');

async function testPMMY() {
  try {
    const input = {
      schemeName: 'Pradhan Mantri Mudra Yojana (PMMY)',
      primaryKeyword: 'Mudra Loan Scheme 2026',
      secondaryKeywords: [
        'Mudra loan eligibility',
        'Mudra loan amount',
        'Mudra loan documents',
        'Mudra loan online apply'
      ],
      location: 'India',
      outcome: 'Complete Scheme Guide',
      language: 'English'
    };
    
    console.log('Starting Research...');
    const researchResult = await performResearch(input);
    console.log('Research completed. Research ID:', researchResult.researchId);
    
    // Official sources count (for newer pipeline structure where verification might be missing)
    const officialSourcesFound = researchResult.verification?.officialSourcesFound !== undefined 
      ? researchResult.verification.officialSourcesFound 
      : (researchResult.sources || []).filter(s => s.authorityScore >= 95 || s.authorityLevel === 'official').length;
    console.log('Official sources found:', officialSourcesFound);
    
    console.log('Starting Content Generation...');
    const articleResult = await generateArticle(researchResult);
    
    let docxBuffer = null;
    let sanityPreview = null;
    
    if (articleResult.success !== false) {
      console.log('Generating DOCX...');
      docxBuffer = await generateDocx(articleResult);
      fs.writeFileSync('pmmy-guide.docx', docxBuffer);
      
      console.log('Generating Sanity Preview...');
      sanityPreview = await sanityService.previewDraft(articleResult, 'mock-category-id');
    } else {
      console.log('Content Generation returned success=false');
    }
    
    // Validations
    const cov = articleResult.criticalFactCoverage?.coveragePercent || 0;
    const fgFailures = articleResult.audit?.failures?.filter(f => f.includes('FactGuard')).length || 0;
    const aud = articleResult.audit?.score || 0;
    const benCount = articleResult.article?.keyBenefits?.length || 0;
    const elCount = articleResult.article?.eligibility?.length || 0;
    const docCount = articleResult.article?.documentsRequired?.length || 0;
    const faqCount = articleResult.article?.faqs?.length || 0;
    
    let keywords = [];
    if (articleResult.seo?.primaryKeyword) keywords.push(articleResult.seo.primaryKeyword);
    if (articleResult.seo?.secondaryKeywords) keywords = keywords.concat(articleResult.seo.secondaryKeywords);
    const keyCount = keywords.length;
    
    const pub = articleResult.publishReadiness;
    const slug = articleResult.seo?.slug;
    
    const benUnique = new Set((articleResult.article?.keyBenefits || []).map(b => b.title)).size === benCount && benCount >= 5;
    const elUnique = new Set((articleResult.article?.eligibility || []).map(e => e.category || e.criteria)).size === elCount && elCount >= 5;
    const docUnique = new Set((articleResult.article?.documentsRequired || []).map(d => d.document)).size === docCount && docCount >= 5;
    const keyUnique = new Set(keywords.map(k=>k.toLowerCase())).size === keyCount && keyCount === 20;
    const hasPlaceholders = keywords.some(k => (k.match(/scheme \d+$/i) && !k.match(/20\d\d$/)) || k.match(/keyword \d+$/i));
    const slugValid = slug && !slug.includes('pmegp') && slug.includes('mudra');
    
    const isPass = articleResult.article && fgFailures === 0 && cov >= 95 && aud >= 95 && pub === 'ready' &&
                   benUnique && elUnique && docUnique && keyUnique && !hasPlaceholders && slugValid &&
                   docxBuffer && sanityPreview;

    const output = {
      FINAL_STATUS: isPass ? 'PASS' : 'FAIL',
      Scheme: 'Pradhan Mantri Mudra Yojana (PMMY)',
      Research_HTTP: '200 OK',
      Official_sources_found: officialSourcesFound,
      Research_model: 'qwen/qwen3.8-27b / openai/gpt-oss-20b',
      Content_model: 'qwen/qwen3.8-27b / openai/gpt-oss-20b',
      Fallback_used: 'Maybe (Check logs)',
      FactGuard_failures: fgFailures,
      CriticalFactCoverage: cov,
      Audit_score: aud,
      publishReadiness: pub,
      Benefits_count: benCount,
      Benefits_unique: benUnique ? 'YES' : 'NO',
      Eligibility_count: elCount,
      Eligibility_unique: elUnique ? 'YES' : 'NO',
      Documents_count: docCount,
      Documents_unique: docUnique ? 'YES' : 'NO',
      FAQ_count: faqCount,
      SEO_keyword_count: keyCount,
      SEO_keywords_unique: keyUnique ? 'YES' : 'NO',
      Placeholder_keywords_found: hasPlaceholders ? 'YES' : 'NO',
      Slug_valid: slugValid ? 'YES' : 'NO',
      DOCX_result: docxBuffer ? 'PASS' : 'FAIL',
      Sanity_Preview_result: sanityPreview ? 'PASS' : 'FAIL',
      Sanity_mutations: 0,
      
      ACTUAL_DATA: {
        shortDescription: articleResult.article?.snippetAnswer,
        benefits: (articleResult.article?.keyBenefits || []).map(b => b.title + ': ' + b.description),
        eligibility: (articleResult.article?.eligibility || []).map(e => e.category + ': ' + e.criteria),
        documents: (articleResult.article?.documentsRequired || []).map(d => d.document),
        faqs: articleResult.article?.faqs?.slice(0, 5),
        conclusion: articleResult.article?.conclusion,
        seoTitle: articleResult.seo?.metaTitle,
        seoDescription: articleResult.seo?.metaDescription,
        keywords: keywords,
        slug: articleResult.seo?.slug,
        canonical: articleResult.seo?.canonicalPath
      }
    };
    
    fs.writeFileSync('pmmy-final-output.json', JSON.stringify(output, null, 2));
    console.log('DONE');
  } catch (err) {
    console.error('ERROR in test', err);
  }
}

testPMMY();
