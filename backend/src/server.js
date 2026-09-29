const dotenv = require("dotenv");

// MUST happen before importing routes/configs
dotenv.config();

const express = require("express");
const cors = require("cors");

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

let providerRoutes = null;
let schemeRoutes = null;
let exportRoutes = null;
let sanityRoutes = null;

try {
  providerRoutes = require("./routes/providerRoutes");
  console.log("[BOOT_ROUTE_OK] /api/providers");
} catch (error) {
  console.error("[BOOT_ROUTE_FAILED] /api/providers", error);
}

try {
  schemeRoutes = require("./routes/schemeRoutes");
  console.log("[BOOT_ROUTE_OK] /api/schemes");
} catch (error) {
  console.error("[BOOT_ROUTE_FAILED] /api/schemes", error);
}

try {
  exportRoutes = require("./routes/exportRoutes");
  console.log("[BOOT_ROUTE_OK] /api/export");
} catch (error) {
  console.error("[BOOT_ROUTE_FAILED] /api/export", error);
}

try {
  sanityRoutes = require("./routes/sanityRoutes");
  console.log("[BOOT_ROUTE_OK] /api/sanity");
} catch (error) {
  console.error("[BOOT_ROUTE_FAILED] /api/sanity", error);
}

if (providerRoutes) app.use("/api/providers", providerRoutes);
if (schemeRoutes) app.use("/api/schemes", schemeRoutes);
if (exportRoutes) app.use("/api/export", exportRoutes);
if (sanityRoutes) app.use("/api/sanity", sanityRoutes);

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
