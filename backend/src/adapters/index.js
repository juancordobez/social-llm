/**
 * Social Mimic - Adapter Factory
 * @description Factory pattern for creating adapters based on configuration
 * 
 * This allows easy switching between providers via environment variables
 * without changing application code.
 */

const { GroqAdapter } = require('./groq.adapter');
const { SupabaseAdapter } = require('./supabase.adapter');
const { UpstashAdapter } = require('./upstash.adapter');

// Twitter (módulo refactorizado)
const { 
  TwitterManager, 
  TwitterScraperAdapter, 
  TwitterAPIAdapter 
} = require('./twitter');

/**
 * Supported adapter types and their implementations
 */
const ADAPTERS = {
  // AI/LLM Adapters
  ai: {
    groq: GroqAdapter,
    // Future: openai, anthropic, ollama
  },
  
  // Database Adapters
  database: {
    supabase: SupabaseAdapter,
    // Future: firebase, planetscale, neon
  },
  
  // Cache Adapters
  cache: {
    upstash: UpstashAdapter,
    // Future: redis, memcached
  },
};

/**
 * Default providers (can be overridden by environment variables)
 */
const DEFAULTS = {
  ai: 'groq',
  database: 'supabase',
  cache: 'upstash',
};

/**
 * Create an adapter instance
 * @param {string} type - Adapter type ('ai', 'database', 'cache')
 * @param {string} provider - Provider name (optional, uses default)
 * @param {Object} config - Configuration options (optional)
 * @returns {Object} Adapter instance
 */
function createAdapter(type, provider = null, config = {}) {
  // Get provider from param, env var, or default
  const selectedProvider = provider 
    || process.env[`${type.toUpperCase()}_PROVIDER`] 
    || DEFAULTS[type];

  const adapters = ADAPTERS[type];
  
  if (!adapters) {
    throw new Error(`Unknown adapter type: ${type}. Available: ${Object.keys(ADAPTERS).join(', ')}`);
  }

  const AdapterClass = adapters[selectedProvider];
  
  if (!AdapterClass) {
    throw new Error(`Unknown ${type} provider: ${selectedProvider}. Available: ${Object.keys(adapters).join(', ')}`);
  }

  return new AdapterClass(config);
}

/**
 * Singleton instances for the application
 */
let instances = {
  ai: null,
  database: null,
  cache: null,
};

/**
 * Get or create a singleton adapter instance
 * @param {string} type - Adapter type
 * @param {Object} config - Configuration (only used on first call)
 * @returns {Object} Adapter instance
 */
function getAdapter(type, config = {}) {
  if (!instances[type]) {
    instances[type] = createAdapter(type, null, config);
  }
  return instances[type];
}

/**
 * Reset adapter instances (useful for testing)
 */
function resetAdapters() {
  instances = {
    ai: null,
    database: null,
    cache: null,
  };
}

/**
 * Get all adapter instances
 * @returns {Object} All adapter instances
 */
function getAllAdapters() {
  return {
    ai: getAdapter('ai'),
    database: getAdapter('database'),
    cache: getAdapter('cache'),
  };
}

/**
 * Health check all adapters
 * @returns {Promise<Object>} Health status for all adapters
 */
async function checkAllAdaptersHealth() {
  const adapters = getAllAdapters();
  const results = {};

  for (const [type, adapter] of Object.entries(adapters)) {
    try {
      results[type] = await adapter.healthCheck();
    } catch (error) {
      results[type] = {
        ok: false,
        message: error.message,
      };
    }
  }

  return {
    healthy: Object.values(results).every(r => r.ok),
    adapters: results,
  };
}

// Convenience exports for common adapters
const getAI = (config) => getAdapter('ai', config);
const getDatabase = (config) => getAdapter('database', config);
const getCache = (config) => getAdapter('cache', config);

// Twitter singleton
let twitterInstance = null;
const getTwitter = (config) => {
  if (!twitterInstance) {
    twitterInstance = new TwitterManager(config);
  }
  return twitterInstance;
};

module.exports = {
  // Factory functions
  createAdapter,
  getAdapter,
  resetAdapters,
  getAllAdapters,
  checkAllAdaptersHealth,
  
  // Convenience getters
  getAI,
  getDatabase,
  getCache,
  getTwitter,
  
  // Direct class exports for testing
  GroqAdapter,
  SupabaseAdapter,
  UpstashAdapter,
  TwitterManager,
  TwitterScraperAdapter,
  TwitterAPIAdapter,
  
  // Constants
  ADAPTERS,
  DEFAULTS,
};
