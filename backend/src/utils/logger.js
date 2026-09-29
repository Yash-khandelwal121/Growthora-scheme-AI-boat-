function logInfo(message, meta = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    level: 'INFO',
    timestamp,
    message,
    ...meta
  }));
}

function logError(message, error, meta = {}) {
  const timestamp = new Date().toISOString();
  
  // Safely extract error details without exposing sensitive info
  const errorDetails = error ? {
    message: error.message,
    name: error.name
  } : {};

  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp,
    message,
    error: errorDetails,
    ...meta
  }));
}

function logWarning(message, meta = {}) {
  const timestamp = new Date().toISOString();
  console.warn(JSON.stringify({
    level: 'WARN',
    timestamp,
    message,
    ...meta
  }));
}

module.exports = {
  logInfo,
  logError,
  logWarning
};
