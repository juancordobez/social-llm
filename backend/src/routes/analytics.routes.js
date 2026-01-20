/**
 * Social Mimic Backend - Analytics Routes
 * @description Routes for analytics and metrics
 */

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analytics.controller');

// GET /api/v1/analytics/overview - Get overview metrics
router.get('/overview', AnalyticsController.getOverview);

// GET /api/v1/analytics/engagement - Get engagement metrics
router.get('/engagement', AnalyticsController.getEngagement);

// GET /api/v1/analytics/content-performance - Get content performance
router.get('/content-performance', AnalyticsController.getContentPerformance);

// GET /api/v1/analytics/audience - Get audience insights
router.get('/audience', AnalyticsController.getAudience);

module.exports = router;
