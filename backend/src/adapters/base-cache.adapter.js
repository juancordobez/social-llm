/**
 * Social Mimic - Base Cache Adapter
 * @description Abstract interface for cache providers
 * 
 * This adapter pattern allows switching between different cache providers
 * (Upstash, Redis, Memcached, etc.) without changing business logic.
 */

class BaseCacheAdapter {
  constructor(config = {}) {
    if (new.target === BaseCacheAdapter) {
      throw new Error('BaseCacheAdapter is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = 'base';
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    throw new Error('get() must be implemented by subclass');
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null) {
    throw new Error('set() must be implemented by subclass');
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    throw new Error('delete() must be implemented by subclass');
  }

  /**
   * Check if a key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('exists() must be implemented by subclass');
  }

  /**
   * Set expiration on a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, ttl) {
    throw new Error('expire() must be implemented by subclass');
  }

  /**
   * Increment a numeric value
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment
   * @returns {Promise<number>} New value
   */
  async increment(key, amount = 1) {
    throw new Error('increment() must be implemented by subclass');
  }

  /**
   * Get multiple values
   * @param {string[]} keys - Cache keys
   * @returns {Promise<Object>} Key-value pairs
   */
  async mget(keys) {
    throw new Error('mget() must be implemented by subclass');
  }

  /**
   * Set multiple values
   * @param {Object} keyValues - Key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async mset(keyValues, ttl = null) {
    throw new Error('mset() must be implemented by subclass');
  }

  /**
   * Check cache health
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }
}

module.exports = { BaseCacheAdapter };
