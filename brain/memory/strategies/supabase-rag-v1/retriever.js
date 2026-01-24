/**
 * Retriever - Busca memorias relevantes
 * 
 * Usa búsqueda semántica (vectorial) para encontrar
 * memorias similares a una query.
 */

const { EMBEDDING_DIMENSION } = require('./embedder');

/**
 * MemoryRetriever - Recuperador de memorias
 */
class MemoryRetriever {
  /**
   * @param {Object} supabaseClient - Cliente de Supabase
   * @param {Object} embedder - Instancia de embedder
   * @param {Object} options - Opciones
   */
  constructor(supabaseClient, embedder, options = {}) {
    if (!supabaseClient) {
      throw new Error('MemoryRetriever requiere cliente Supabase');
    }
    if (!embedder) {
      throw new Error('MemoryRetriever requiere embedder');
    }

    this.db = supabaseClient;
    this.embedder = embedder;
    this.tableName = 'memories';
    
    // Configuración
    this.defaultLimit = options.defaultLimit || 5;
    this.defaultThreshold = options.defaultThreshold || 0.7;
  }

  /**
   * Busca memorias similares a una query
   * 
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.userId - ID del usuario
   * @param {string} params.query - Texto a buscar
   * @param {number} params.limit - Máximo de resultados
   * @param {number} params.threshold - Similitud mínima (0-1)
   * @param {string} params.type - Filtrar por tipo
   * @returns {Promise<Array<Object>>} Memorias encontradas
   */
  async search(params) {
    const {
      userId,
      query,
      limit = this.defaultLimit,
      threshold = this.defaultThreshold,
      type = null,
    } = params;

    if (!userId || !query) {
      throw new Error('userId y query son requeridos');
    }

    // Generar embedding de la query
    let queryEmbedding;
    try {
      queryEmbedding = await this.embedder.embed(query);
    } catch (error) {
      console.error('[Retriever] Error generando embedding:', error.message);
      // Fallback a búsqueda por texto
      return this._searchByText(userId, query, limit, type);
    }

    // Usar función RPC de Supabase para búsqueda vectorial
    const { data, error } = await this.db.rpc('search_memories', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: limit,
      match_threshold: threshold,
    });

    if (error) {
      console.error('[Retriever] Error en búsqueda:', error);
      // Fallback a búsqueda simple
      return this._searchByText(userId, query, limit, type);
    }

    // Filtrar por tipo si se especificó
    let results = data || [];
    if (type) {
      results = results.filter(m => m.memory_type === type);
    }

    // Marcar como accedidas
    for (const memory of results) {
      this._markAccessed(memory.id);
    }

    console.log(`[Retriever] Encontradas ${results.length} memorias relevantes`);
    return results;
  }

  /**
   * Obtiene contexto formateado para el LLM
   * 
   * @param {Object} params - Parámetros
   * @param {string} params.userId - ID del usuario
   * @param {string} params.query - Query actual
   * @param {number} params.maxTokens - Tokens máximos para contexto
   * @returns {Promise<string>} Contexto formateado
   */
  async getContext(params) {
    const { userId, query, maxTokens = 500 } = params;

    const memories = await this.search({
      userId,
      query,
      limit: 10, // Traer más y luego filtrar por tokens
    });

    if (memories.length === 0) {
      return '';
    }

    // Formatear memorias como contexto
    let context = 'CONTEXTO DE CONVERSACIONES PREVIAS:\n';
    let currentTokens = 0;
    const approxTokensPerChar = 0.25;

    for (const memory of memories) {
      const memoryText = this._formatMemory(memory);
      const memoryTokens = memoryText.length * approxTokensPerChar;

      if (currentTokens + memoryTokens > maxTokens) {
        break;
      }

      context += memoryText + '\n';
      currentTokens += memoryTokens;
    }

    return context.trim();
  }

  /**
   * Obtiene memorias recientes (sin búsqueda semántica)
   * 
   * @param {string} userId - ID del usuario
   * @param {number} limit - Máximo de resultados
   * @param {string} type - Filtrar por tipo
   * @returns {Promise<Array<Object>>} Memorias recientes
   */
  async getRecent(userId, limit = 10, type = null) {
    let query = this.db
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('memory_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Retriever] Error obteniendo recientes:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtiene memorias de una conversación específica
   * 
   * @param {string} conversationId - ID de la conversación
   * @returns {Promise<Array<Object>>} Memorias de la conversación
   */
  async getConversation(conversationId) {
    const { data, error } = await this.db
      .from('conversation_memories')
      .select(`
        position,
        memories (*)
      `)
      .eq('conversation_id', conversationId)
      .order('position', { ascending: true });

    if (error) {
      console.error('[Retriever] Error obteniendo conversación:', error);
      return [];
    }

    return (data || []).map(cm => ({
      ...cm.memories,
      position: cm.position,
    }));
  }

  /**
   * Búsqueda por texto simple (fallback)
   * @private
   */
  async _searchByText(userId, query, limit, type) {
    const searchTerms = query.toLowerCase().split(/\s+/).slice(0, 5);
    
    let dbQuery = this.db
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Traer más para filtrar

    if (type) {
      dbQuery = dbQuery.eq('memory_type', type);
    }

    const { data, error } = await dbQuery;

    if (error || !data) {
      return [];
    }

    // Filtrar por coincidencia de términos
    const results = data.filter(memory => {
      const content = memory.content.toLowerCase();
      return searchTerms.some(term => content.includes(term));
    });

    return results.slice(0, limit);
  }

  /**
   * Formatea una memoria para incluir en contexto
   * @private
   */
  _formatMemory(memory) {
    const date = new Date(memory.created_at).toLocaleDateString();
    const type = memory.memory_type;
    
    return `[${date}] (${type}): ${memory.content}`;
  }

  /**
   * Marca memoria como accedida (async, no bloquea)
   * Usa RPC para incrementar contador atómicamente
   * @private
   */
  _markAccessed(id) {
    // Usar update simple en lugar de SQL raw
    // El incremento atómico se maneja con RPC en producción
    this.db
      .from(this.tableName)
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .then(() => {})
      .catch(() => {}); // Ignorar errores (no crítico)
  }
}

module.exports = { MemoryRetriever };
