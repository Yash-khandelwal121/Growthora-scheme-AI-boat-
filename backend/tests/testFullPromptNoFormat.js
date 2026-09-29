const { Groq } = require('groq-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const { openaiPrompt } = require('../src/prompts/openaiResearchPrompt');

async function testModel(modelName, prompt) {
  try {
    console.log('Testing model with full prompt:', modelName);
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: prompt.replace('{{RESEARCH_CONTEXT}}', JSON.stringify({ schemeName: "PMEGP" })) },
        { role: 'user', content: 'Return valid JSON.' }
      ],
      temperature: 0.1
    });
    console.log('Success:', modelName, 'Response len:', response.choices[0].message.content.length);
  } catch (error) {
    console.error('Failed:', modelName);
    console.error('Error:', error.message);
    if (error.error) console.error('Data:', JSON.stringify(error.error));
  }
}

testModel('openai/gpt-oss-20b', openaiPrompt);
