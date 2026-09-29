# Growthora Scheme AI

Growthora Scheme AI is an internal web application designed to automate government scheme research and generate SEO/AEO/GEO optimized long-form content. 

## Project Architecture (Phase 2)

The system currently operates a Multi-AI Government Scheme Research + Verification Engine.
- **Frontend Dashboard**: React SPA for configuring research constraints and viewing results.
- **Backend API**: Express server coordinating the research logic.
- **AI Providers**: OpenAI (gpt-4o), Google Gemini (gemini-2.5-pro), Anthropic Claude (claude-3-7-sonnet-20250219).

### Orchestration Flow
React Dashboard -> Express API (`/api/schemes/research`) -> Research Service
-> [Parallel] OpenAI Research + Gemini Research
-> Claude Verification (Fact Checking and Conflict Detection)
-> Fact Resolver (Deduplication, Source Authority Scoring, Confidence Assignment)
-> Master Scheme Research JSON -> Returned to Frontend

## Setup Instructions

### Environment Variables

Required environment variables in `backend/.env`:
```
PORT=5000

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-pro

ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

RESEARCH_MAX_SOURCES=15
RESEARCH_TIMEOUT_MS=120000
```
*Note: Do not expose these to the React frontend.*

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Current Functionality

### Phase 2: Multi-AI Research Engine
- **Provider Configuration Check**: Frontend displays the connection status for OpenAI, Gemini, and Claude on load.
- **AI Orchestration**: Fetches scheme data via OpenAI and Gemini in parallel, then passes the structured JSON outputs to Claude to detect conflicts and verify facts.
- **Source Verification**: All citations returned by the models are deduplicated and mapped against an authority scoring system (`sourceAuthority.js`). Official government domains (`.gov.in`, `.nic.in`) rank highest.
- **Fact Resolver**: Calculates an `overallConfidence` score and highlights if manual human review is required.

### Phase 3: SEO/AEO/GEO Content Engine
- **Content Writer**: Synthesizes the Master Research JSON into optimized SEO, AEO, and GEO sections.
- **Fact Guard**: Verifies that the generated content introduces no hallucinated dates, percentages, amounts, or URLs not present in the Master Research JSON.
- **Content Auditor**: Checks metadata length (Title <= 50 chars, Description <= 150 chars), snippet length (40-65 words), and EXACTLY 15 FAQs.
- **Schema Agent**: Generates valid JSON-LD (`@graph` format) structurally optimized for Article, WebPage, and BreadcrumbList.

### Phase 4: DOCX Export Engine
- **Document Generation**: Transforms the generated Article JSON into a highly polished, professional Microsoft Word Document using the `docx` package.
- **Structural Integrity**: Maps Headings, Tables, Lists, URLs, and JSON-LD automatically into the document while strictly keeping factual data immutable.
- **Download Integration**: Accessible via the React UI as a blob stream download (`/api/export/docx`).
- **Styling**: Enforces strict typographic guidelines tailored for Growthora Advisory Private Limited.

### Phase 5: Sanity CMS Auto-Draft Integration
- **Sanity Connection**: Interfaces safely with Sanity to generate unpublished draft documents (`drafts.*`) automatically mapped to the appropriate Portable Text structure.
- **Dry-Run Preview**: By default, Sanity mutations are protected by `SANITY_WRITE_ENABLED=false`, providing a safe JSON UI preview of the exact mapped payload without issuing live writes.
- **Mock Safety Constraints**: Active protection against writing Mock development content to the live Sanity environment.
- **Audit Gating**: Fully blocks pushing content to CMS if the internal audit (`audit.passed`) fails or critical human review tags remain unresolved.

## Development Mode (MOCK)
To run the system without making live AI provider calls (saving API credits):
1. In `backend/.env`, set:
   ```
   USE_MOCK_RESEARCH=true
   USE_MOCK_CONTENT=true
   SANITY_WRITE_ENABLED=false
   ```
2. The UI will prominently display a mock testing banner.
3. The system will use localized fixtures located in `backend/src/mocks/` to test architecture, fact guards, audits, DOCX exporting structurally, and Sanity portable text mapping.

## Limitations & Future Phases
- Automatic web publishing directly from the dashboard is deliberately restricted to ensure manual review via Sanity Studio.

## Testing
Run the deterministic utility tests in the backend:
```bash
node tests/sourceAuthority.test.js
node tests/parseAIJson.test.js
node tests/testMockE2E.js
node tests/testPhase3Content.js
node tests/docxExport.test.js
node tests/testSanityE2E.js
```
