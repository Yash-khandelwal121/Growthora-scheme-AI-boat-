require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sanityConfig = require('../src/config/sanity');

async function discover() {
  try {
    const client = sanityConfig.getSanityClient();
    
    console.log("=== STEP 1: UNIQUE DOCUMENT TYPES ===");
    const types = await client.fetch(`array::unique(*[]._type)`);
    console.log(JSON.stringify(types, null, 2));
    
    console.log("\n=== STEP 2: DOCUMENT COUNTS ===");
    const counts = {};
    for (const type of types) {
      if (type.startsWith('sanity.') || type.startsWith('system.')) continue;
      counts[type] = await client.fetch(`count(*[_type == $type])`, { type });
    }
    console.log(JSON.stringify(counts, null, 2));
    
    console.log("\n=== STEP 3 & 4 & 5: SAMPLE DOCUMENTS ===");
    // Filter out standard system types
    const contentTypes = Object.keys(counts).filter(k => !k.startsWith('sanity.'));
    
    for (const type of contentTypes) {
      console.log(`\nInspecting type: ${type}`);
      const samples = await client.fetch(`*[_type == $type][0...1]`, { type });
      if (samples.length > 0) {
        const doc = samples[0];
        
        // Output field names and their primitive/structural types safely
        const fieldInfo = {};
        for (const [key, value] of Object.entries(doc)) {
          if (value === null) {
            fieldInfo[key] = 'null';
          } else if (Array.isArray(value)) {
            // Check for portable text
            const isPortableText = value.length > 0 && value[0]._type === 'block';
            fieldInfo[key] = `Array<${value.length > 0 ? value[0]._type || typeof value[0] : 'empty'}> ${isPortableText ? '(PortableText)' : ''}`;
            
            if (key === 'faqs' || key === 'faq') {
              fieldInfo[key + '_structure'] = value.length > 0 ? Object.keys(value[0]) : [];
            }
          } else if (typeof value === 'object') {
            fieldInfo[key] = `Object<${value._type || 'unknown'}> - keys: ${Object.keys(value).join(', ')}`;
          } else {
            fieldInfo[key] = typeof value;
          }
        }
        
        console.log(JSON.stringify(fieldInfo, null, 2));
      }
    }
    
    console.log("\n=== COMPLETE ===");
  } catch (err) {
    console.error("Discovery Error:", err.message);
  }
}

discover();
