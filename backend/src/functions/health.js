/**
 * Social Mimic - Health Check Function
 * @description Cloud Function for health check endpoint
 */

const functions = require('@google-cloud/functions-framework');

/**
 * Health check handler
 * GET /health
 */
const healthHandler = (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    provider: 'google-cloud-functions',
    region: process.env.FUNCTION_REGION || 'us-central1',
  });
};

// Register with Functions Framework (for local testing)
functions.http('handler', healthHandler);

// Export for Serverless Framework
module.exports.handler = healthHandler;
