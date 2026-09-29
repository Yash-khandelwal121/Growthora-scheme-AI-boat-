const { Groq } = require('groq-sdk');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testModel(modelName) {
  try {
    console.log('Testing model:', modelName);
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: 'Return JSON:\n{\"status\":\"ok\"}' }],
      response_format: { type: 'json_object' }
    });
    console.log('Success:', modelName);
    console.log('Content:', response.choices[0].message.content);
  } catch (error) {
    console.error('Failed:', modelName);
    console.error('Error Status:', error.status || error.message);
    if (error.error) console.error('Error Data:', JSON.stringify(error.error));
  }
}

async function run() {
  await testModel('openai/gpt-oss-20b');
  await testModel('qwen/qwen3.8-27b');
  await testModel('openai/gpt-oss-120b');
}

run();
