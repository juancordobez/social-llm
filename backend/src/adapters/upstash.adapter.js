/**
 * Social Mimic - Upstash Redis Adapter
 * @description Implementation for Upstash Redis (Serverless Redis - FREE)
 * 
 * Upstash Free Tier includes:
 * - 10,000 commands/day
 * - 256MB storage
 * - Serverless (no connection management)
 * 
 * @see https://upstash.com/docs/redis/overall/getstarted
 */

const { BaseCacheAdapter } = require('./base-cache.adapter');

class UpstashAdapter extends BaseCacheAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'upstash';
    this.url = config.url || process.env.UPSTASH_REDIS_URL;
    this.token = config.token || process.env.UPSTASH_REDIS_TOKEN;
    
    if (!this.url || !this.token) {
      console.warn('[UpstashAdapter] Warning: UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not configured');
    }
  }

  /**
   * Make HTTP request to Upstash REST API
   * @private
   */
  async _request(command) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upstash Error: ${error}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Upstash Error: ${result.error}`);
    }

    return result.result;
  }

  /**
   * Execute a Redis command
   * @private
   */
  async _command(...args) {
    return this._request(args);
  }

  async get(key) {
    const value = await this._command('GET', key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set(key, value, ttl = null) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttl) {
      await this._command('SET', key, serialized, 'EX', ttl);
    } else {
      await this._command('SET', key, serialized);
    }
    
    return true;
  }

  async delete(key) {
    await this._command('DEL', key);
    return true;
  }

  async exists(key) {
    const result = await this._command('EXISTS', key);
    return result === 1;
  }

  async expire(key, ttl) {
    await this._command('EXPIRE', key, ttl);
    return true;
  }

  async increment(key, amount = 1) {
    if (amount === 1) {
      return this._command('INCR', key);
    }
    return this._command('INCRBY', key, amount);
  }

  async mget(keys) {
    const values = await this._command('MGET', ...keys);
    const result = {};
    
    keys.forEach((key, i) => {
      const value = values[i];
      if (value !== null) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
    });
    
    return result;
  }

  async mset(keyValues, ttl = null) {
    const args = [];
    for (const [key, value] of Object.entries(keyValues)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      args.push(key, serialized);
    }
    
    await this._command('MSET', ...args);
    
    // Set TTL for each key if provided
    if (ttl) {
      for (const key of Object.keys(keyValues)) {
        await this.expire(key, ttl);
      }
    }
    
    return true;
  }

  // ==================== Rate Limiting ====================

  /**
   * Check and increment rate limit
   * @param {string} identifier - User/IP identifier
   * @param {number} limit - Max requests
   * @param {number} windowSeconds - Time window in seconds
   * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
   */
  async checkRateLimit(identifier, limit, windowSeconds) {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    // Use sorted set for sliding window
    // Remove old entries
    await this._command('ZREMRANGEBYSCORE', key, 0, windowStart);
    
    // Count current entries
    const count = await this._command('ZCARD', key);
    
    if (count < limit) {
      // Add new entry
      await this._command('ZADD', key, now, `${now}`);
      await this._command('EXPIRE', key, windowSeconds);
      
      return {
        allowed: true,
        remaining: limit - count - 1,
        resetIn: windowSeconds,
      };
    }

    // Get oldest entry to calculate reset time
    const oldest = await this._command('ZRANGE', key, 0, 0, 'WITHSCORES');
    const resetIn = oldest.length > 1 
      ? Math.ceil((parseInt(oldest[1]) + (windowSeconds * 1000) - now) / 1000)
      : windowSeconds;

    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }

  // ==================== Session Management ====================

  /**
   * Store session data
   * @param {string} sessionId - Session identifier
   * @param {Object} data - Session data
   * @param {number} ttl - Session TTL in seconds (default 24h)
   */
  async setSession(sessionId, data, ttl = 86400) {
    const key = `session:${sessionId}`;
    await this.set(key, data, ttl);
    return true;
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.delete(key);
  }

  // ==================== Caching Helpers ====================

  /**
   * Get or set cache with automatic fetching
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Cache TTL
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Cache AI response
   * @param {string} prompt - The prompt (used to generate cache key)
   * @param {Object} response - AI response to cache
   * @param {number} ttl - Cache TTL (default 1 hour)
   */
  async cacheAIResponse(prompt, response, ttl = 3600) {
    // Create a hash of the prompt for the cache key
    const hash = this._simpleHash(prompt);
    const key = `ai:response:${hash}`;
    await this.set(key, response, ttl);
    return key;
  }

  async getCachedAIResponse(prompt) {
    const hash = this._simpleHash(prompt);
    const key = `ai:response:${hash}`;
    return this.get(key);
  }

  /**
   * Simple string hash for cache keys
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ==================== Health Check ====================

  async healthCheck() {
    try {
      if (!this.url || !this.token) {
        return { ok: false, message: 'Upstash not configured' };
      }

      // Simple ping
      const result = await this._command('PING');

      return {
        ok: result === 'PONG',
        message: result === 'PONG' ? 'Upstash connected successfully' : 'Unexpected response',
      };
    } catch (error) {
      return {
        ok: false,
        message: `Upstash health check failed: ${error.message}`,
      };
    }
  }
}

module.exports = { UpstashAdapter };
