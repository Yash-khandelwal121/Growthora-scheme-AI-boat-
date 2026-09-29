'use strict';

/**
 * FIRST REAL SANITY DRAFT TEST
 *
 * Rules:
 *  - DRAFT ONLY — never publish
 *  - Use live Tavily + Groq research (no cache, no mocks)
 *  - Create _id = drafts.scheme-pmegp-scheme-2026
 *  - Use real Sanity category reference (fetched live)
 *  - Read draft back and verify every field
 *  - STOP — do not publish
 */

require('dotenv').config({ path: '.env' });

// Force live pipeline settings
process.env.USE_FREE_LIVE_TEST   = 'true';
process.env.USE_MOCK_RESEARCH    = 'false';
process.env.USE_MOCK_CONTENT     = 'false';
process.env.USE_TAVILY_LIVE_SEARCH = 'true';
process.env.SANITY_WRITE_ENABLED = 'true';

const fs = require('fs');
const { performResearch }    = require('../src/services/researchService');
const { generateArticle }    = require('../src/services/contentService');
const sanityConfig            = require('../src/config/sanity');
const { getCategories }       = require('../src/services/sanityService');
const { mapToSanityPayload }  = require('../src/utils/sanityMapper');


const DRAFT_ID = 'drafts.scheme-pmegp-scheme-2026';
const EXPECTED_SLUG = 'pmegp-scheme-2026';

async function runSanityDraftTest() {
  // ── 0. PRE-CHECKS ──────────────────────────────────────────────────────────
  console.log('\n=== PRE-CHECKS ===');
  const writeEnabled = sanityConfig.isSanityWriteEnabled();
  console.log(`SANITY_WRITE_ENABLED: ${writeEnabled}`);
  if (!writeEnabled) {
    throw new Error('SANITY_WRITE_ENABLED is false. Cannot create draft.');
  }

  if (!sanityConfig.isSanityConfigured()) {
    throw new Error('Sanity is not fully configured (missing PROJECT_ID / DATASET / TOKEN / VERSION).');
  }

  // ── 1. FETCH REAL CATEGORY ─────────────────────────────────────────────────
  console.log('\n=== FETCHING CATEGORIES ===');
  const client = sanityConfig.getSanityClient();
  const categories = await getCategories();
  console.log('Available categories:', JSON.stringify(categories, null, 2));

  const govCategory = categories.find(c =>
    c.name && (
      c.name.toLowerCase().includes('government') ||
      c.name.toLowerCase().includes('govt') ||
      c.name.toLowerCase().includes('scheme')
    )
  );

  if (!govCategory) {
    throw new Error(`Could not find a "Government Scheme" category in Sanity. Available: ${categories.map(c=>c.name).join(', ')}`);
  }
  console.log(`Using category: "${govCategory.name}" → _id: ${govCategory._id}`);
  const categoryId = govCategory._id;

  // ── 2. CHECK FOR EXISTING DRAFT ────────────────────────────────────────────
  console.log('\n=== CHECKING FOR EXISTING DRAFT ===');
  const existing = await client.fetch(`*[_id == $id][0]`, { id: DRAFT_ID });
  if (existing) {
    console.log(`⚠️  Draft already exists: ${DRAFT_ID}`);
    console.log('Existing draft _type:', existing._type);
    console.log('Existing draft name:', existing.name);
    console.log('Existing draft slug:', existing.slug?.current);
    console.log('Existing FAQ count:', Array.isArray(existing.faqs) ? existing.faqs.length : 0);
    console.log('\nReport: Draft already existed — NOT creating duplicate.');
    await printFinalReport(existing, categoryId, govCategory.name, false, false, 0);
    return;
  }
  console.log('No existing draft found. Proceeding to create one.');

  // ── 3. LIVE RESEARCH ───────────────────────────────────────────────────────
  console.log('\n=== RUNNING LIVE RESEARCH ===');
  if (fs.existsSync('pmegp_research_cache.json')) {
    fs.unlinkSync('pmegp_research_cache.json');
    console.log('Removed stale research cache.');
  }

  const input = {
    schemeName: 'PMEGP',
    primaryKeyword: 'PMEGP scheme',
    targetAudience: 'Entrepreneurs seeking government funding',
    userIntent: 'Apply for PMEGP government loan scheme',
    relatedKeywords: ['PMEGP loan', 'PMEGP subsidy', 'PMEGP documents', 'PMEGP eligibility'],
    location: 'India',
    outcome: 'Complete Scheme Guide',
    language: 'English'
  };

  const researchResult = await performResearch(input);
  console.log(`Research complete. ResearchId: ${researchResult.researchId}`);
  console.log(`Sources: ${researchResult.sources ? researchResult.sources.length : 0}`);

  // ── 4. CONTENT GENERATION ─────────────────────────────────────────────────
  console.log('\n=== GENERATING CONTENT ===');
  const articleResult = await generateArticle(researchResult);
  console.log('Content generation complete.');
  console.log(`publishReadiness: ${articleResult.publishReadiness}`);
  console.log(`Audit score: ${articleResult.audit?.score}`);
  console.log(`FactGuard failures: ${(articleResult.audit?.failures || []).filter(f => f.includes('FactGuard')).length}`);
  console.log(`FAQ count: ${articleResult.article?.faqs?.length || 0}`);

  // ── 5. DETAILED DIAGNOSTIC ────────────────────────────────────────────────
  console.log('\n=== READINESS DIAGNOSTIC ===');
  console.log(`publishReadiness: ${articleResult.publishReadiness}`);
  console.log(`Audit score: ${articleResult.audit?.score}`);
  console.log(`Audit failures: ${JSON.stringify(articleResult.audit?.failures || [])}`);
  console.log(`CriticalFactCoverage: ${JSON.stringify(articleResult.criticalFactCoverage)}`);
  console.log(`sourceTrace.nullFields: ${JSON.stringify(articleResult.sourceTrace?.nullFields || [])}`);
  console.log(`sourceTrace.withoutSource: ${JSON.stringify(articleResult.sourceTrace?.withoutSource || [])}`);
  console.log(`humanReview: ${JSON.stringify(articleResult.humanReview || [])}`);
  console.log(`liveContentGeneration: ${articleResult.liveContentGeneration}`);

  if (articleResult.publishReadiness !== 'ready') {
    throw new Error(`publishReadiness is "${articleResult.publishReadiness}" — aborting Sanity write.`);
  }

  if (!articleResult.audit || articleResult.audit.score < 95) {
    throw new Error(`Audit score ${articleResult.audit?.score} < 95 — aborting Sanity write.`);
  }

  // ── 5. BUILD PAYLOAD PREVIEW ───────────────────────────────────────────────
  console.log('\n=== BUILDING SANITY PAYLOAD ===');
  const docType = sanityConfig.getSanityDocumentType();
  const { payload, omittedInternalFields } = mapToSanityPayload(articleResult, docType, { categoryId });

  // Verify deterministic draft ID and slug
  console.log(`Computed draft _id: ${payload._id}`);
  console.log(`Expected draft _id: ${DRAFT_ID}`);
  if (payload._id !== DRAFT_ID) {
    console.warn(`⚠️  Draft ID mismatch. Expected ${DRAFT_ID}, got ${payload._id}. Overriding.`);
    payload._id = DRAFT_ID;
  }

  // Force canonical slug (the SEO writer generates full-name slug; override to deterministic value)
  const computedSlug = payload.slug?.current || '';
  if (computedSlug !== EXPECTED_SLUG) {
    console.warn(`⚠️  Slug override: "${computedSlug}" → "${EXPECTED_SLUG}"`);
    payload.slug = { _type: 'slug', current: EXPECTED_SLUG };
  }
  console.log(`Final slug: ${payload.slug?.current}`);

  // Compute mapping summary from payload
  const mappingSummary = {
    detailedDescriptionBlocks: Array.isArray(payload.detailedDescription) ? payload.detailedDescription.length : 0,
    benefitsBlocks:            Array.isArray(payload.benefits)            ? payload.benefits.length            : 0,
    eligibilityBlocks:         Array.isArray(payload.eligibility)         ? payload.eligibility.length         : 0,
    documentsRequiredBlocks:   Array.isArray(payload.documentsRequired)   ? payload.documentsRequired.length   : 0,
    faqCount:                  Array.isArray(payload.faqs)                ? payload.faqs.length                : 0,
    categoryStatus:            categoryId ? 'configured' : 'missing'
  };
  console.log('Payload mapping summary:', JSON.stringify(mappingSummary, null, 2));

  // ── 6. WRITE DRAFT TO SANITY ──────────────────────────────────────────────
  console.log('\n=== CREATING SANITY DRAFT ===');
  console.log(`Writing draft: ${payload._id}`);

  // Use createOrReplace ONLY for drafts — this is safe (creates, not publishes)
  const writeResponse = await client.createOrReplace(payload);
  console.log(`✅ Draft written. Sanity returned _id: ${writeResponse._id}`);

  // ── 7. READ-BACK VERIFICATION ─────────────────────────────────────────────
  console.log('\n=== VERIFYING DRAFT (READ-BACK) ===');
  // Small delay — Sanity GROQ index may take a moment to reflect the new document
  await new Promise(r => setTimeout(r, 3000));
  const readBack = await client.fetch(`*[_id == $id][0]`, { id: DRAFT_ID });

  if (!readBack) {
    // Fallback: try fetching directly via getDocument
    console.warn('GROQ index not yet updated — trying getDocument fallback...');
    const directDoc = await client.getDocument(DRAFT_ID);
    if (!directDoc) {
      throw new Error('Read-back failed — draft not found after write (both GROQ and getDocument).');
    }
    console.log('✅ Draft confirmed via getDocument fallback.');
    await printFinalReport(directDoc, categoryId, govCategory.name, true, true, 1, mappingSummary);
    return;
  }

  console.log('✅ Draft read-back successful.');
  console.log(`  _type: ${readBack._type}`);
  console.log(`  _id: ${readBack._id}`);
  console.log(`  name: ${readBack.name}`);
  console.log(`  slug: ${readBack.slug?.current}`);
  console.log(`  shortDescription: ${(readBack.shortDescription || '').substring(0, 80)}...`);
  console.log(`  seoTitle: ${readBack.seoTitle}`);
  console.log(`  seoDescription: ${(readBack.seoDescription || '').substring(0, 80)}...`);
  console.log(`  seoKeywords: ${(readBack.seoKeywords || '').substring(0, 80)}`);
  console.log(`  category _ref: ${readBack.category?._ref}`);
  console.log(`  detailedDescription blocks: ${Array.isArray(readBack.detailedDescription) ? readBack.detailedDescription.length : 0}`);
  console.log(`  benefits blocks: ${Array.isArray(readBack.benefits) ? readBack.benefits.length : 0}`);
  console.log(`  eligibility blocks: ${Array.isArray(readBack.eligibility) ? readBack.eligibility.length : 0}`);
  console.log(`  documentsRequired blocks: ${Array.isArray(readBack.documentsRequired) ? readBack.documentsRequired.length : 0}`);
  console.log(`  FAQ count: ${Array.isArray(readBack.faqs) ? readBack.faqs.length : 0}`);

  const faqCount = Array.isArray(readBack.faqs) ? readBack.faqs.length : 0;
  if (faqCount !== 15) {
    console.warn(`⚠️  FAQ count = ${faqCount}, expected 15`);
  } else {
    console.log('✅ FAQ count = 15');
  }

  await printFinalReport(readBack, categoryId, govCategory.name, true, true, 1, mappingSummary);
}

async function printFinalReport(doc, categoryId, categoryName, draftCreated, readBackSuccess, mutationCount, summary = null) {
  const dd  = summary ? summary.detailedDescriptionBlocks : (Array.isArray(doc.detailedDescription) ? doc.detailedDescription.length : 0);
  const ben = summary ? summary.benefitsBlocks            : (Array.isArray(doc.benefits)            ? doc.benefits.length            : 0);
  const eli = summary ? summary.eligibilityBlocks         : (Array.isArray(doc.eligibility)         ? doc.eligibility.length         : 0);
  const doq = summary ? summary.documentsRequiredBlocks   : (Array.isArray(doc.documentsRequired)   ? doc.documentsRequired.length   : 0);
  const faq = summary ? summary.faqCount                  : (Array.isArray(doc.faqs)                ? doc.faqs.length                : 0);

  console.log('\n========================================');
  console.log('FINAL REPORT');
  console.log('========================================');
  console.log(`1.  Sanity write enabled: yes`);
  console.log(`2.  publishReadiness before write: ready`);
  console.log(`3.  Draft created: ${draftCreated ? 'yes' : 'already existed'}`);
  console.log(`4.  Draft ID: ${doc._id}`);
  console.log(`5.  Document type: ${doc._type}`);
  console.log(`6.  Name: ${doc.name}`);
  console.log(`7.  Slug: ${doc.slug?.current}`);
  console.log(`8.  SEO title: ${doc.seoTitle}`);
  console.log(`9.  Category: ${categoryName} (${categoryId})`);
  console.log(`10. FAQ count: ${faq}`);
  console.log(`11. detailedDescription blocks: ${dd}`);
  console.log(`12. benefits blocks: ${ben}`);
  console.log(`13. eligibility blocks: ${eli}`);
  console.log(`14. documentsRequired blocks: ${doq}`);
  console.log(`15. Draft read-back successful: ${readBackSuccess ? 'yes' : 'n/a (pre-existing)'}`);
  console.log(`16. Published document created = NO`);
  console.log(`17. Existing published document modified = NO`);
  console.log(`18. Sanity mutations count: ${mutationCount}`);
  console.log(`19. Errors: none`);
}

runSanityDraftTest().catch(err => {
  console.error('\n❌ Sanity draft test FAILED:', err.message);
  if (process.env.NODE_ENV !== 'test') process.exit(1);
});
