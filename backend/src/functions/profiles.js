/**
 * Social Mimic - Profiles Cloud Function
 * @description Cloud Function for profile management
 */

const functions = require('@google-cloud/functions-framework');
const { PersonalityEngine } = require('../core/personality-engine');
const { getAI } = require('../adapters');

// Initialize PersonalityEngine
let personalityEngine = null;
const getPersonalityEngine = () => {
  if (!personalityEngine) {
    personalityEngine = new PersonalityEngine({ aiAdapter: getAI() });
  }
  return personalityEngine;
};

/**
 * Profiles handler - Routes requests based on method and path
 */
const profilesHandler = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const path = req.path || '/';
    const method = req.method;
    
    console.log(`[Profiles] ${method} ${path}`); // Debug log

    // Route: GET /api/v1/profiles - List all profiles
    if (method === 'GET' && (path === '/' || path === '' || path === '/api/v1/profiles')) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Profiles retrieved successfully',
        _meta: { provider: 'gcp-cloud-functions' }
      });
    }

    // Route: POST /api/v1/profiles - Create profile
    if (method === 'POST' && (path === '/' || path === '')) {
      const profileData = req.body;
      console.log('Creating new profile:', profileData);
      
      // TODO: Implement with database
      return res.status(201).json({
        success: true,
        data: { id: 'new-profile-id', ...profileData },
        message: 'Profile created successfully'
      });
    }

    // Route: GET /api/v1/profiles/:id - Get profile by ID
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (method === 'GET' && idMatch) {
      const id = idMatch[1];
      
      // TODO: Implement with database
      return res.status(200).json({
        success: true,
        data: { id },
        message: 'Profile retrieved successfully'
      });
    }

    // Route: PUT /api/v1/profiles/:id - Update profile
    if (method === 'PUT' && idMatch) {
      const id = idMatch[1];
      const updateData = req.body;
      
      // TODO: Implement with database
      return res.status(200).json({
        success: true,
        data: { id, ...updateData },
        message: 'Profile updated successfully'
      });
    }

    // Route: DELETE /api/v1/profiles/:id - Delete profile
    if (method === 'DELETE' && idMatch) {
      const id = idMatch[1];
      
      // TODO: Implement with database
      return res.status(200).json({
        success: true,
        message: `Profile ${id} deleted successfully`
      });
    }

    // Route: POST /api/v1/profiles/:id/analyze - Analyze personality
    const analyzeMatch = path.match(/^\/([^\/]+)\/analyze$/);
    if (method === 'POST' && analyzeMatch) {
      const id = analyzeMatch[1];
      const { bio, samplePosts, preferences } = req.body;
      console.log(`Analyzing personality for profile: ${id}`);
      
      const engine = getPersonalityEngine();
      
      // Analyze personality with PersonalityEngine
      const traits = await engine.analyzeProfile({
        bio,
        samplePosts,
        preferences,
      });
      
      // Get simplified version for UI
      const simplified = engine.simplifyTraits(traits);
      
      return res.status(200).json({
        success: true,
        data: {
          profileId: id,
          personality: {
            traits,      // Full traits object
            simplified,  // Human-readable version
          },
          analyzedAt: new Date().toISOString(),
        },
        message: 'Personality analysis completed'
      });
    }

    // 404 - Route not found
    return res.status(404).json({
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
      statusCode: 404
    });

  } catch (error) {
    console.error('Error in profiles handler:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message,
      statusCode: 500
    });
  }
};

// Register with Functions Framework
functions.http('handler', profilesHandler);

// Export for Serverless Framework
module.exports.handler = profilesHandler;
