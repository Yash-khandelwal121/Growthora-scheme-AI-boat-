require('dotenv').config();

async function testTavily() {
  const apiKey = process.env.TAVILY_API_KEY ? process.env.TAVILY_API_KEY.trim() : '';
  console.log("Checking Tavily Connectivity...");
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: "Government of India",
        search_depth: "basic",
        max_results: 1
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(JSON.stringify({
        success: true,
        networkRequest: true,
        provider: 'tavily',
        status: response.status,
        results_count: data.results?.length || 0
      }, null, 2));
    } else {
      console.error(JSON.stringify({
        success: false,
        status: response.status,
        error: await response.text()
      }, null, 2));
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testTavily();
