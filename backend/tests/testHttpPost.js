require('dotenv').config({ path: '.env' });
process.env.USE_MOCK_RESEARCH = "true";
process.env.PORT = "5001"; // Avoid conflict

const express = require('express');
const schemeRoutes = require('../src/routes/schemeRoutes');
const app = express();
app.use(express.json());
app.use('/api/schemes', schemeRoutes);

const server = app.listen(5001, async () => {
  console.log("Mock server running on 5001");
  
  try {
    const response = await fetch("http://localhost:5001/api/schemes/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schemeName: "PMEGP",
        primaryKeyword: "PMEGP Scheme 2026",
        secondaryKeywords: ["PMEGP eligibility"],
        location: "India",
        outcome: "Complete Scheme Guide",
        language: "English"
      })
    });
    
    const data = await response.json();
    console.log("POST /api/schemes/research success:", data.success);
    console.log("Mode:", data.data?.mode);
    console.log("Live Research:", data.data?.liveResearch);
    console.log("Overall Confidence:", data.data?.verification?.overallConfidence?.level);
  } catch (err) {
    console.error("HTTP POST Failed:", err);
  } finally {
    server.close();
  }
});
