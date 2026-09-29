const { Groq } = require('groq-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const { claudeVerifierPrompt } = require('../src/prompts/claudeVerifierPrompt');

async function run() {
  try {
    const response = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: claudeVerifierPrompt.substring(0, 500) },
        { role: 'user', content: 'Return a simple JSON object' }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    console.log('Success!', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.error) console.error(JSON.stringify(error.error));
  }
}
run();
