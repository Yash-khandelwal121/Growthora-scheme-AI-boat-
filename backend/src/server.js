const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const schemeRoutes = require('./routes/schemeRoutes');

// Load environment variables
dotenv.config();

console.log("Sanity Config Diagnostic:");
console.log({
  projectId: !!process.env.SANITY_PROJECT_ID?.trim(),
  dataset: !!process.env.SANITY_DATASET?.trim(),
  token: !!process.env.SANITY_API_TOKEN?.trim(),
  apiVersion: !!process.env.SANITY_API_VERSION?.trim(),
  studioUrl: !!process.env.SANITY_STUDIO_URL?.trim(),
  documentType: !!process.env.SANITY_DOCUMENT_TYPE?.trim(),
  writeEnabled: String(process.env.SANITY_WRITE_ENABLED).toLowerCase() === "true"
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "Growthora Scheme AI API is running"
  });
});

// API Routes
const providerRoutes = require('./routes/providerRoutes');
const exportRoutes = require('./routes/exportRoutes');
const sanityRoutes = require('./routes/sanityRoutes');
app.use('/api/providers', providerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/sanity', sanityRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
