/**
 * DOCX integrity test — run BEFORE and AFTER the fix.
 * Usage: node tests/testDocxIntegrity.js
 */
'use strict';

require('dotenv').config({ path: '.env' });

const fs   = require('fs');
const path = require('path');
// DOMParser not required for basic test

// Try to use yauzl (most precise ZIP checker), fallback to manual
let yauzl = null;
try { yauzl = require('yauzl'); } catch (_) {}

const FIXTURE_PATH = path.join(__dirname, 'docx_test_fixture.json');

async function run() {
  console.log('\n=== DOCX INTEGRITY TEST ===\n');

  let articleJson;
  if (fs.existsSync(FIXTURE_PATH)) {
    articleJson = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    console.log('Using saved fixture:', FIXTURE_PATH);
  } else {
    // Build a minimal safe fixture
    articleJson = buildMinimalFixture();
    fs.writeFileSync(FIXTURE_PATH, JSON.stringify(articleJson, null, 2));
    console.log('Created minimal fixture:', FIXTURE_PATH);
  }

  const { generateDocx } = require('../src/services/docxService');

  console.log('\n1. Generating DOCX buffer...');
  const buffer = await generateDocx(articleJson);

  console.log(`2. Buffer type: ${Buffer.isBuffer(buffer) ? 'Buffer ✅' : 'NOT a Buffer ❌'}`);
  console.log(`3. File size: ${buffer.length} bytes ${buffer.length > 1000 ? '✅' : '❌ too small'}`);

  // Check PK ZIP signature
  const sig = buffer.slice(0, 4).toString('hex');
  const isPK = sig === '504b0304';
  console.log(`4. ZIP/PK signature (${sig}): ${isPK ? '✅' : '❌ invalid signature'}`);

  // Write to temp file
  const outPath = path.join(__dirname, 'docx_integrity_test.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`5. Written to: ${outPath}`);

  // ZIP structure check
  if (yauzl) {
    await checkZipWithYauzl(outPath);
  } else {
    checkZipManual(buffer);
  }

  console.log('\n=== TEST COMPLETE ===');
}

function checkZipManual(buffer) {
  console.log('\n--- Manual ZIP entry scan ---');
  const required = ['[Content_Types].xml', 'word/document.xml', 'word/_rels/document.xml.rels'];
  const found = [];
  let pos = 0;
  let entries = 0;

  while (pos < buffer.length - 4) {
    // Local file header signature 0x04034b50
    if (buffer[pos] === 0x50 && buffer[pos+1] === 0x4b && buffer[pos+2] === 0x03 && buffer[pos+3] === 0x04) {
      const nameLen  = buffer.readUInt16LE(pos + 26);
      const extraLen = buffer.readUInt16LE(pos + 28);
      const name = buffer.slice(pos + 30, pos + 30 + nameLen).toString('utf8');
      found.push(name);
      entries++;
      pos = pos + 30 + nameLen + extraLen;
      // skip over compressed data by reading compressed size
      // (we just advance past headers; data parsing is approximate)
    } else {
      pos++;
    }
  }

  console.log(`Total ZIP entries found: ${entries}`);
  required.forEach(r => {
    const ok = found.includes(r);
    console.log(`  ${r}: ${ok ? '✅' : '❌ MISSING'}`);
  });
}

async function checkZipWithYauzl(filePath) {
  return new Promise((resolve) => {
    console.log('\n--- yauzl ZIP check ---');
    const required = ['[Content_Types].xml', 'word/document.xml', 'word/_rels/document.xml.rels'];
    const found = [];

    yauzl.open(filePath, { lazyEntries: true }, (err, zip) => {
      if (err) {
        console.error('ZIP open error:', err.message);
        return resolve();
      }
      zip.readEntry();
      zip.on('entry', (entry) => {
        found.push(entry.fileName);
        zip.readEntry();
      });
      zip.on('end', () => {
        console.log(`Total ZIP entries: ${found.length}`);
        required.forEach(r => {
          const ok = found.includes(r);
          console.log(`  ${r}: ${ok ? '✅' : '❌ MISSING'}`);
        });
        resolve();
      });
      zip.on('error', (e) => {
        console.error('ZIP error:', e.message);
        resolve();
      });
    });
  });
}

function buildMinimalFixture() {
  return {
    mode: 'test',
    researchSchemeName: 'Prime Minister\'s Employment Generation Programme (PMEGP)',
    sourceResearchId: 'res_test',
    seo: {
      primaryKeyword: 'PMEGP scheme 2026',
      secondaryKeywords: ['PMEGP loan', 'PMEGP subsidy'],
      metaTitle: 'PMEGP Scheme 2026 – Complete Guide',
      metaDescription: 'Learn everything about PMEGP scheme 2026 eligibility, subsidy, and application process.',
      slug: '/govtschemes/pmegp-scheme-2026',
      canonicalPath: 'https://growthora.co.in/govtschemes/pmegp-scheme-2026'
    },
    article: {
      h1: 'PMEGP Scheme 2026: Complete Guide to Eligibility, Subsidy & Application',
      snippetAnswer: 'PMEGP is a credit-linked subsidy scheme providing up to 35% subsidy for manufacturing projects up to ₹50 lakh and service projects up to ₹20 lakh.',
      schemeAtAGlance: {
        'Scheme Name': 'Prime Minister\'s Employment Generation Programme',
        'Ministry': 'Ministry of MSME',
        'Maximum Project Cost (Manufacturing)': '₹50 lakh',
        'Maximum Project Cost (Service)': '₹20 lakh',
        'Urban Subsidy (General)': '15%',
        'Rural Subsidy (General)': '25%'
      },
      introduction: 'The Prime Minister\'s Employment Generation Programme (PMEGP) is a flagship government scheme.',
      detailedExplanation: [
        { heading: 'What is PMEGP?', text: 'PMEGP is a credit-linked subsidy scheme for setting up new enterprises.' },
        { heading: 'Subsidy Structure', text: 'The subsidy ranges from 15% to 35% depending on category and location.' }
      ],
      keyBenefits: [
        { title: 'High Subsidy', description: 'Up to 35% subsidy for special category beneficiaries in rural areas.' },
        { title: 'Large Projects', description: 'Manufacturing projects up to ₹50 lakh are eligible.' }
      ],
      financialAssistance: [
        { category: 'General – Urban', subsidy: '15%', contribution: '10%' },
        { category: 'General – Rural', subsidy: '25%', contribution: '10%' }
      ],
      eligibility: [
        { category: 'Age', criteria: 'Minimum 18 years' },
        { category: 'Education', criteria: '8th pass for projects above ₹10 lakh' }
      ],
      documentsRequired: [
        { document: 'Aadhaar Card', purpose: 'Identity', requirementStatus: 'Mandatory' },
        { document: 'Project Report', purpose: 'Business plan', requirementStatus: 'Mandatory' }
      ],
      applicationProcess: [
        'Register on the PMEGP e-portal at kviconline.gov.in',
        'Fill in your personal and project details',
        'Upload required documents',
        'Submit and await bank approval'
      ],
      mistakesToAvoid: [
        'Submitting incomplete project reports',
        'Not obtaining the required 8th-pass certificate for large projects'
      ],
      faqs: Array.from({ length: 15 }, (_, i) => ({
        question: `FAQ Question ${i + 1} about PMEGP?`,
        answer: `This is the answer to FAQ ${i + 1} about the PMEGP scheme eligibility and subsidy structure.`
      })),
      conclusion: 'PMEGP remains one of India\'s strongest self-employment schemes for new entrepreneurs.'
    },
    sources: [
      { title: 'KVIC PMEGP Portal', url: 'https://www.kviconline.gov.in/pmegpeportal', domain: 'kviconline.gov.in', authorityLevel: 'official_implementing_agency' },
      { title: 'MSME Official Portal', url: 'https://msme.gov.in', domain: 'msme.gov.in', authorityLevel: 'official_ministry' }
    ],
    schema: {
      schemaObject: { '@context': 'https://schema.org', '@type': 'Article', headline: 'PMEGP Scheme 2026' }
    },
    audit: { score: 99, passed: true, warnings: [], failures: [] },
    humanReview: []
  };
}

run().catch(err => {
  console.error('\n❌ Integrity test error:', err.message);
  process.exit(1);
});
