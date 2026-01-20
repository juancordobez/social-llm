/**
 * Social Mimic - Supabase Adapter
 * @description Implementation for Supabase (PostgreSQL + pgvector + Auth)
 * 
 * Supabase Free Tier includes:
 * - 500MB PostgreSQL database
 * - pgvector for embeddings
 * - Built-in Auth
 * - Realtime subscriptions
 * 
 * @see https://supabase.com/docs
 */

const { BaseDatabaseAdapter } = require('./base-database.adapter');

class SupabaseAdapter extends BaseDatabaseAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'supabase';
    this.url = config.url || process.env.SUPABASE_URL;
    this.anonKey = config.anonKey || process.env.SUPABASE_ANON_KEY;
    this.serviceKey = config.serviceKey || process.env.SUPABASE_SERVICE_KEY;
    
    // Use service key for server-side operations, anon key for client
    this.apiKey = this.serviceKey || this.anonKey;
    
    if (!this.url || !this.apiKey) {
      console.warn('[SupabaseAdapter] Warning: SUPABASE_URL or SUPABASE_ANON_KEY not configured');
    }
  }

  /**
   * Make HTTP request to Supabase REST API
   * @private
   */
  async _request(endpoint, options = {}) {
    const { method = 'GET', body, headers = {} } = options;

    const response = await fetch(`${this.url}/rest/v1/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`,
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Supabase Error: ${error.message || response.statusText}`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Call Supabase RPC function
   * @private
   */
  async _rpc(functionName, params = {}) {
    const response = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Supabase RPC Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // ==================== CRUD Operations ====================

  async create(table, data) {
    const result = await this._request(table, {
      method: 'POST',
      body: data,
      headers: { 'Prefer': 'return=representation' },
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async find(table, query = {}, options = {}) {
    const { select = '*', limit, offset, orderBy } = options;
    
    // Build query string
    let endpoint = `${table}?select=${select}`;
    
    // Add filters
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        endpoint += `&${key}=eq.${value}`;
      }
    }
    
    // Add pagination
    if (limit) endpoint += `&limit=${limit}`;
    if (offset) endpoint += `&offset=${offset}`;
    if (orderBy) endpoint += `&order=${orderBy}`;

    return this._request(endpoint);
  }

  async findById(table, id) {
    const results = await this._request(`${table}?id=eq.${id}`);
    return results?.[0] || null;
  }

  async update(table, id, data) {
    const result = await this._request(`${table}?id=eq.${id}`, {
      method: 'PATCH',
      body: { ...data, updated_at: new Date().toISOString() },
      headers: { 'Prefer': 'return=representation' },
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async delete(table, id) {
    await this._request(`${table}?id=eq.${id}`, { method: 'DELETE' });
    return true;
  }

  // ==================== Vector Operations ====================

  /**
   * Store embedding with metadata
   * Requires pgvector extension enabled in Supabase
   */
  async storeEmbedding(table, data) {
    const { embedding, ...metadata } = data;
    
    return this.create(table, {
      ...metadata,
      embedding: embedding, // pgvector handles the array
    });
  }

  /**
   * Semantic search using pgvector
   * Requires a Supabase RPC function for vector similarity search
   * 
   * Example SQL function to create in Supabase:
   * ```sql
   * create or replace function match_embeddings(
   *   query_embedding vector(1536),
   *   match_table text,
   *   match_threshold float,
   *   match_count int
   * )
   * returns table (
   *   id uuid,
   *   content text,
   *   metadata jsonb,
   *   similarity float
   * )
   * language plpgsql
   * as $$
   * begin
   *   return query execute format('
   *     select
   *       id,
   *       content,
   *       metadata,
   *       1 - (embedding <=> $1) as similarity
   *     from %I
   *     where 1 - (embedding <=> $1) > $2
   *     order by embedding <=> $1
   *     limit $3
   *   ', match_table)
   *   using query_embedding, match_threshold, match_count;
   * end;
   * $$;
   * ```
   */
  async vectorSearch(table, embedding, options = {}) {
    const { limit = 10, threshold = 0.5, filter = {} } = options;

    try {
      // Use RPC function for vector search
      return await this._rpc('match_embeddings', {
        query_embedding: embedding,
        match_table: table,
        match_threshold: threshold,
        match_count: limit,
      });
    } catch (error) {
      // Fallback: If RPC doesn't exist, log warning
      console.warn('[SupabaseAdapter] Vector search RPC not configured:', error.message);
      console.warn('Please create the match_embeddings function in Supabase');
      return [];
    }
  }

  // ==================== Profile Operations ====================

  async createProfile(profileData) {
    return this.create('profiles', {
      ...profileData,
      created_at: new Date().toISOString(),
    });
  }

  async getProfile(profileId) {
    return this.findById('profiles', profileId);
  }

  async updateProfile(profileId, data) {
    return this.update('profiles', profileId, data);
  }

  async listProfiles(userId) {
    return this.find('profiles', { user_id: userId });
  }

  // ==================== Content Operations ====================

  async saveContent(contentData) {
    return this.create('content', {
      ...contentData,
      created_at: new Date().toISOString(),
    });
  }

  async getContent(contentId) {
    return this.findById('content', contentId);
  }

  async listContent(profileId, options = {}) {
    return this.find('content', { profile_id: profileId }, options);
  }

  // ==================== Memory/RAG Operations ====================

  async saveMemory(profileId, content, embedding, metadata = {}) {
    return this.storeEmbedding('memories', {
      profile_id: profileId,
      content,
      embedding,
      metadata,
      created_at: new Date().toISOString(),
    });
  }

  async searchMemories(profileId, embedding, options = {}) {
    const results = await this.vectorSearch('memories', embedding, {
      ...options,
      filter: { profile_id: profileId },
    });
    return results;
  }

  // ==================== Utility Methods ====================

  async healthCheck() {
    try {
      if (!this.url || !this.apiKey) {
        return { ok: false, message: 'Supabase not configured' };
      }

      // Simple query to check connection
      await this._request('profiles?limit=1');

      return {
        ok: true,
        message: 'Supabase connected successfully',
        url: this.url,
      };
    } catch (error) {
      return {
        ok: false,
        message: `Supabase health check failed: ${error.message}`,
      };
    }
  }

  async rawQuery(sql, params = []) {
    // For complex queries, use Supabase's SQL editor or create an RPC
    console.warn('[SupabaseAdapter] Raw queries should use Supabase RPC functions');
    throw new Error('Use _rpc() for custom SQL operations');
  }
}

module.exports = { SupabaseAdapter };
