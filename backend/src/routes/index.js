/**
 * Social Mimic Backend - API Routes
 * @description Main router for API v1
 */

const express = require('express');
const router = express.Router();

// Import route modules
const profileRoutes = require('./profile.routes');
const contentRoutes = require('./content.routes');
const analyticsRoutes = require('./analytics.routes');

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Social Mimic API',
    version: '1.0.0',
    description: 'AI-powered social media community manager',
    endpoints: {
      profiles: '/api/v1/profiles',
      content: '/api/v1/content',
      analytics: '/api/v1/analytics',
    },
    documentation: '/api/v1/docs',
  });
});

// Mount route modules
router.use('/profiles', profileRoutes);
router.use('/content', contentRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
