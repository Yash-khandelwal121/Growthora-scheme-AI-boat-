require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sanityConfig = require('../src/config/sanity');

async function inspectProduction() {
  try {
    const client = sanityConfig.getSanityClient();

    console.log("=== SCHEME CATEGORIES ===");
    const categories = await client.fetch(`*[_type == "schemeCategory"]{_id, title, slug}`);
    console.log(JSON.stringify(categories, null, 2));

    console.log("\n=== SCHEME PAGE CONVENTION INSPECTION ===");
    const schemePages = await client.fetch(`*[_type == "schemePage"][0...2]{name, slug, category, shortDescription}`);
    console.log(JSON.stringify(schemePages, null, 2));

    console.log("\n=== COMPLETE ===");
  } catch(e) {
    console.error(e);
  }
}
inspectProduction();
