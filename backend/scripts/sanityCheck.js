require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: process.env.SANITY_API_VERSION || '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

async function run() {
  const query = '*[_type == "schemePage"][0...10] { "slug": slug.current, name, seoTitle }';
  const docs = await client.fetch(query);
  console.log(JSON.stringify(docs, null, 2));
}

run().catch(console.error);
