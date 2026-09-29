const { Groq } = require('groq-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const { openaiPrompt } = require('../src/prompts/openaiResearchPrompt');
const { geminiPrompt } = require('../src/prompts/geminiResearchPrompt');
const { claudeVerifierPrompt } = require('../src/prompts/claudeVerifierPrompt');

async function testModel(modelName, prompt) {
  try {
    console.log('Testing model with full prompt:', modelName);
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: prompt.replace('{{RESEARCH_CONTEXT}}', JSON.stringify({ schemeName: "PMEGP" })) },
        { role: 'user', content: 'Return valid JSON.' }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    console.log('Success:', modelName, 'Response len:', response.choices[0].message.content.length);
  } catch (error) {
    console.error('Failed:', modelName);
    console.error('Error:', error.message);
    if (error.error) console.error('Data:', JSON.stringify(error.error));
  }
}

async function run() {
  await testModel('openai/gpt-oss-20b', openaiPrompt);
  await testModel('qwen/qwen3.8-27b', geminiPrompt);
  await testModel('openai/gpt-oss-120b', claudePrompt = "Placeholder since I haven't fixed the export in my script but wait, I can just use geminiPrompt");
}

run();
