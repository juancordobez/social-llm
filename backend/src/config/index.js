/**
 * Social Mimic Backend - Configuration Index
 * @description Central configuration exports
 */

const { logger } = require('./logger');

// Database configuration
const database = {
  postgresql: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL) || 3600,
  },
};

// AI Services configuration
const ai = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
    maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 4096,
  },
  openSearch: {
    endpoint: process.env.OPENSEARCH_ENDPOINT,
    region: process.env.AWS_REGION || 'us-east-1',
  },
};

// Server configuration
const server = {
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

// JWT configuration
const jwt = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

module.exports = {
  logger,
  database,
  ai,
  server,
  jwt,
};
