require('dotenv').config({ path: './.env' });
const { getGroqClient } = require('./src/config/groq');
const { researchSchema } = require('./src/utils/researchSchema');
const { withGroqRetry } = require('./src/utils/groqRetry');
const { parseAIJson } = require('./src/utils/parseAIJson');

async function test() {
  const groqClient = getGroqClient();
  const fallbackModels = ['qwen/qwen3.8-27b'];
  const aggregatedEvidence = 'NIDHI-PRAYAS is a grant scheme by DST, Ministry of Science & Technology. It provides a prototype grant of up to Rs 10 lakhs for innovators. There is no manufacturing or service project cost like PMEGP. Age limit: must be above 18 years. Official portal is https://nidhi.dst.gov.in. Implementating agency is Society for Innovation and Entrepreneurship.';
  const sources = [
    { id: 'src_123', url: 'https://nidhi.dst.gov.in', title: 'DST NIDHI' }
  ];

  const stageBInstruction = `
You are a structured normalization agent.
You must use ONLY the supplied web evidence to create factual scheme fields.
If a value is not found, set the "value" to null.
NULL IS NOT "SUPPORTED". If a value is null, its "supportedBy" array MUST be empty.

RAW WEB EVIDENCE:
${aggregatedEvidence}

DISCOVERED SOURCES:
${JSON.stringify(sources, null, 2)}

PROPERTIES:
${JSON.stringify(researchSchema.schema.properties, null, 2)}
  `;

  const stageBResponse = await withGroqRetry('Groq Normalization', fallbackModels, async (currentModel, attempt) => {
    const config = {
      model: currentModel,
      messages: [
        { role: 'system', content: 'You are a strict data extraction and normalization agent. Output JSON only.' },
        { role: 'user', content: stageBInstruction }
      ],
      temperature: 0.1,
      max_tokens: 4000
    };
    if (attempt === 0) {
      config.response_format = { type: 'json_schema', json_schema: { name: researchSchema.name, schema: researchSchema.schema, strict: true } };
    }
    return await groqClient.chat.completions.create(config);
  });

  const content = stageBResponse.choices[0].message.content;
  const parsed = parseAIJson(content);
  console.log(JSON.stringify(parsed, null, 2));
}

test().catch(console.error);
