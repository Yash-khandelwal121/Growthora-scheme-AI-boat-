function sanitizeFilename(filename) {
  // Remove special characters, keep alphanumeric and hyphens
  let clean = filename.replace(/[^a-zA-Z0-9- ]/g, "").trim();
  clean = clean.replace(/\s+/g, "-");
  return clean || "Export";
}

module.exports = { sanitizeFilename };
