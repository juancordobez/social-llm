/**
 * Social Mimic - Base Database Adapter
 * @description Abstract interface for database providers
 * 
 * This adapter pattern allows switching between different database providers
 * (Supabase, Firebase, PlanetScale, etc.) without changing business logic.
 */

class BaseDatabaseAdapter {
  constructor(config = {}) {
    if (new.target === BaseDatabaseAdapter) {
      throw new Error('BaseDatabaseAdapter is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = 'base';
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new record
   * @param {string} table - Table name
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(table, data) {
    throw new Error('create() must be implemented by subclass');
  }

  /**
   * Find records by query
   * @param {string} table - Table name
   * @param {Object} query - Query filters
   * @param {Object} options - Query options (select, limit, offset, orderBy)
   * @returns {Promise<Object[]>} Array of records
   */
  async find(table, query = {}, options = {}) {
    throw new Error('find() must be implemented by subclass');
  }

  /**
   * Find a single record by ID
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null
   */
  async findById(table, id) {
    throw new Error('findById() must be implemented by subclass');
  }

  /**
   * Update a record
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated record
   */
  async update(table, id, data) {
    throw new Error('update() must be implemented by subclass');
  }

  /**
   * Delete a record
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(table, id) {
    throw new Error('delete() must be implemented by subclass');
  }

  // ==================== Vector Operations ====================

  /**
   * Store a vector embedding
   * @param {string} table - Table name
   * @param {Object} data - Data including embedding vector
   * @returns {Promise<Object>} Created record
   */
  async storeEmbedding(table, data) {
    throw new Error('storeEmbedding() must be implemented by subclass');
  }

  /**
   * Search for similar vectors
   * @param {string} table - Table name
   * @param {number[]} embedding - Query embedding
   * @param {Object} options - Search options (limit, threshold, filter)
   * @returns {Promise<Object[]>} Similar records with similarity scores
   */
  async vectorSearch(table, embedding, options = {}) {
    throw new Error('vectorSearch() must be implemented by subclass');
  }

  // ==================== Utility Methods ====================

  /**
   * Check database connection health
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Execute raw SQL query (use with caution)
   * @param {string} sql - SQL query
   * @param {any[]} params - Query parameters
   * @returns {Promise<any>}
   */
  async rawQuery(sql, params = []) {
    throw new Error('rawQuery() must be implemented by subclass');
  }
}

module.exports = { BaseDatabaseAdapter };
