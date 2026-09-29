const dotenv = require("dotenv");

// MUST happen before importing routes/configs
dotenv.config();

const express = require("express");
const cors = require("cors");

const schemeRoutes = require("./routes/schemeRoutes");
const providerRoutes = require("./routes/providerRoutes");
const exportRoutes = require("./routes/exportRoutes");
const sanityRoutes = require("./routes/sanityRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  exposedHeaders: ["Content-Disposition"]
}));

app.use(express.json());

// Independent health endpoint
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Growthora Scheme AI API is running"
  });
});

// Avoid favicon noise
app.get("/favicon.ico", (req, res) => {
  return res.status(204).end();
});

app.use("/api/providers", providerRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/sanity", sanityRoutes);

// Production-safe error handler
app.use((err, req, res, next) => {
  console.error("[UNHANDLED_EXPRESS_ERROR]", err);

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// Local development only.
// Vercel imports the Express app instead of starting a permanent listener.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
