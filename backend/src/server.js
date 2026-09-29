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

function safeMount(path, modulePath) {
  try {
    const router = require(modulePath);
    app.use(path, router);
    console.log(`[BOOT_ROUTE_OK] ${path}`);
  } catch (error) {
    console.error(`[BOOT_ROUTE_FAILED] ${path}`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

safeMount("/api/providers", "./routes/providerRoutes");
safeMount("/api/schemes", "./routes/schemeRoutes");
safeMount("/api/export", "./routes/exportRoutes");
safeMount("/api/sanity", "./routes/sanityRoutes");

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
