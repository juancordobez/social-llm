/**
 * Social Mimic Backend - Content Routes
 * @description Routes for content generation and management
 */

const express = require('express');
const router = express.Router();
const ContentController = require('../controllers/content.controller');

// GET /api/v1/content - List generated content
router.get('/', ContentController.getAll);

// GET /api/v1/content/:id - Get content by ID
router.get('/:id', ContentController.getById);

// POST /api/v1/content/generate - Generate new content
router.post('/generate', ContentController.generate);

// POST /api/v1/content/:id/publish - Publish content to social media
router.post('/:id/publish', ContentController.publish);

// POST /api/v1/content/:id/schedule - Schedule content for later
router.post('/:id/schedule', ContentController.schedule);

// DELETE /api/v1/content/:id - Delete content
router.delete('/:id', ContentController.delete);

module.exports = router;
