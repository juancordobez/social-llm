/**
 * Social Mimic - Content Cloud Function
 * @description Cloud Function for content generation and management
 */

const functions = require('@google-cloud/functions-framework');
const { PersonalityEngine } = require('../core/personality-engine');
const { getAI } = require('../adapters');

// Initialize PersonalityEngine (singleton pattern for Cloud Functions)
let personalityEngine = null;
const getPersonalityEngine = () => {
  if (!personalityEngine) {
    personalityEngine = new PersonalityEngine({ aiAdapter: getAI() });
  }
  return personalityEngine;
};

/**
 * Content handler - Routes requests based on method and path
 */
const contentHandler = async (req, res) => {
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
    
    console.log(`[Content] ${method} ${path}`); // Debug log

    // Route: GET /api/v1/content - List all content
    if (method === 'GET' && (path === '/' || path === '' || path === '/api/v1/content')) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Content retrieved successfully',
        _meta: { provider: 'gcp-cloud-functions' }
      });
    }

    // Route: POST /api/v1/content/generate - Generate new content with AI
    if (method === 'POST' && path === '/generate') {
      const { profileId, topic, platform, personality, context } = req.body;
      console.log(`Generating content for profile: ${profileId}, topic: ${topic}`);
      
      const engine = getPersonalityEngine();
      
      // Use provided personality or create default
      const traits = personality || await engine.analyzeProfile({
        preferences: {
          tone: { formality: 0.5, humor: 0.3, enthusiasm: 0.6, empathy: 0.5 },
          topics: [topic],
          objectives: { primary_goal: 'engagement' },
        },
      });
      
      // Generate content with PersonalityEngine
      const result = await engine.generateContent(traits, {
        topic,
        platform: platform || 'twitter',
        contentType: 'post',
        context,
      });
      
      return res.status(201).json({
        success: true,
        data: {
          id: `content-${Date.now()}`,
          profileId,
          ...result,
        },
        message: 'Content generated successfully'
      });
    }

    // Route: GET /api/v1/content/:id - Get content by ID
    const idMatch = path.match(/^\/([^\/]+)$/);
    if (method === 'GET' && idMatch && idMatch[1] !== 'generate') {
      const id = idMatch[1];
      
      return res.status(200).json({
        success: true,
        data: { id },
        message: 'Content retrieved successfully'
      });
    }

    // Route: POST /api/v1/content/:id/publish - Publish content
    const publishMatch = path.match(/^\/([^\/]+)\/publish$/);
    if (method === 'POST' && publishMatch) {
      const id = publishMatch[1];
      const { platform } = req.body;
      console.log(`Publishing content ${id} to ${platform}`);
      
      // TODO: Implement with Social Media Adapter
      return res.status(200).json({
        success: true,
        data: {
          contentId: id,
          platform,
          status: 'published',
          publishedAt: new Date().toISOString(),
          externalId: `ext-${Date.now()}`
        },
        message: 'Content published successfully'
      });
    }

    // Route: POST /api/v1/content/:id/schedule - Schedule content
    const scheduleMatch = path.match(/^\/([^\/]+)\/schedule$/);
    if (method === 'POST' && scheduleMatch) {
      const id = scheduleMatch[1];
      const { platform, scheduledTime } = req.body;
      console.log(`Scheduling content ${id} for ${scheduledTime}`);
      
      return res.status(200).json({
        success: true,
        data: {
          contentId: id,
          platform,
          status: 'scheduled',
          scheduledTime
        },
        message: 'Content scheduled successfully'
      });
    }

    // Route: DELETE /api/v1/content/:id - Delete content
    if (method === 'DELETE' && idMatch) {
      const id = idMatch[1];
      
      return res.status(200).json({
        success: true,
        message: `Content ${id} deleted successfully`
      });
    }

    // 404 - Route not found
    return res.status(404).json({
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
      statusCode: 404
    });

  } catch (error) {
    console.error('Error in content handler:', error);
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
functions.http('handler', contentHandler);

// Export for Serverless Framework
module.exports.handler = contentHandler;
