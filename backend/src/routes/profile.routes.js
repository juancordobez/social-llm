/**
 * Social Mimic Backend - Profile Routes
 * @description Routes for social media profile management
 */

const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profile.controller');

// GET /api/v1/profiles - List all profiles
router.get('/', ProfileController.getAll);

// GET /api/v1/profiles/:id - Get profile by ID
router.get('/:id', ProfileController.getById);

// POST /api/v1/profiles - Create new profile
router.post('/', ProfileController.create);

// PUT /api/v1/profiles/:id - Update profile
router.put('/:id', ProfileController.update);

// DELETE /api/v1/profiles/:id - Delete profile
router.delete('/:id', ProfileController.delete);

// POST /api/v1/profiles/:id/analyze - Analyze profile personality
router.post('/:id/analyze', ProfileController.analyzePersonality);

module.exports = router;
