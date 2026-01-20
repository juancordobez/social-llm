/**
 * Social Mimic - Local Development Server
 * @description Express server that simulates Cloud Functions locally
 */

const express = require('express');
const app = express();

// Import function handlers
const { health, profiles, content, analytics } = require('./functions.js');

// Middleware
app.use(express.json());

// Mount function handlers as routes
app.all('/health', health);
app.all('/api/v1/profiles*', (req, res) => {
  // Adjust path for the handler
  const originalPath = req.path;
  req.path = req.path.replace('/api/v1/profiles', '') || '/';
  req.originalPath = originalPath;
  profiles(req, res);
});
app.all('/api/v1/content*', (req, res) => {
  const originalPath = req.path;
  req.path = req.path.replace('/api/v1/content', '') || '/';
  req.originalPath = originalPath;
  content(req, res);
});
app.all('/api/v1/analytics*', (req, res) => {
  const originalPath = req.path;
  req.path = req.path.replace('/api/v1/analytics', '') || '/';
  req.originalPath = originalPath;
  analytics(req, res);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Social Mimic API (Local Dev)',
    version: '0.1.0',
    mode: 'development',
    endpoints: {
      health: '/health',
      profiles: '/api/v1/profiles',
      content: '/api/v1/content',
      analytics: '/api/v1/analytics'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Social Mimic Local Development Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Running on: http://localhost:${PORT}
🏥 Health:     http://localhost:${PORT}/health
👤 Profiles:   http://localhost:${PORT}/api/v1/profiles
📝 Content:    http://localhost:${PORT}/api/v1/content
📊 Analytics:  http://localhost:${PORT}/api/v1/analytics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Simulating Google Cloud Functions
  `);
});
