require('dotenv').config();
const { Groq } = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = process.env.GROQ_RESEARCH_PRIMARY_MODEL || 'qwen/qwen3.8-27b';

async function testGroq() {
  try {
    const data = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a JSON-only API.' },
        { role: 'user', content: 'Return exactly this JSON:\n{"status":"ok"}' }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
      temperature: 0.1
    });
    
    const responseData = {
      httpStatus: 200,
      actualModel: data.model,
      finishReason: data.choices[0].finish_reason,
      content: data.choices[0].message.content,
      usage: data.usage
    };
    
    console.log(JSON.stringify({ success: true, ...responseData }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      status: error.status,
      headers: error.response ? error.response.headers : null
    }, null, 2));
  }
}

testGroq();
