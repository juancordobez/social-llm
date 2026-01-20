/**
 * Social Mimic - Functions Entry Point
 * @description Entry point for Google Cloud Functions Framework local development
 */

// Export all function handlers for local development
const healthHandler = require('./functions/health.js');
const profilesHandler = require('./functions/profiles.js');
const contentHandler = require('./functions/content.js');
const analyticsHandler = require('./functions/analytics.js');

// Re-export handlers
module.exports = {
  health: healthHandler.handler,
  profiles: profilesHandler.handler,
  content: contentHandler.handler,
  analytics: analyticsHandler.handler,
};
