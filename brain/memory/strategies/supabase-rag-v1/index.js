/**
 * MemorySystem - Sistema de memoria RAG
 * 
 * Estrategia: Supabase + pgvector v1
 * 
 * Coordina:
 * - Store: Guardar memorias
 * - Retriever: Buscar memorias relevantes
 * - Embedder: Convertir texto a vectores
 * 
 * @version 1.0.0-experimental
 */

const { MemoryStore } = require('./store');
const { MemoryRetriever } = require('./retriever');
const { createEmbedder, EMBEDDING_DIMENSION } = require('./embedder');

// Metadata de la estrategia
const STRATEGY_INFO = {
  name: 'supabase-rag-v1',
  version: '1.0.0',
  description: 'Sistema RAG con Supabase pgvector para memoria semántica',
  status: 'experimental',
  requirements: ['@supabase/supabase-js', '@xenova/transformers'],
};

/**
 * MemorySystem - Clase principal
 */
class MemorySystem {
  /**
   * @param {Object} supabaseClient - Cliente de Supabase
   * @param {Object} options - Opciones de configuración
   * @param {string} options.embedderType - 'local' o 'mock'
   * @param {number} options.defaultLimit - Límite por defecto de búsqueda
   * @param {number} options.similarityThreshold - Umbral de similitud
   */
  constructor(supabaseClient, options = {}) {
    if (!supabaseClient) {
      throw new Error('MemorySystem requiere cliente Supabase');
    }

    const {
      embedderType = 'local',
      defaultLimit = 5,
      similarityThreshold = 0.7,
    } = options;

    // Crear embedder
    this.embedder = createEmbedder(embedderType);

    // Crear store y retriever
    this.store = new MemoryStore(supabaseClient, this.embedder);
    this.retriever = new MemoryRetriever(supabaseClient, this.embedder, {
      defaultLimit,
      defaultThreshold: similarityThreshold,
    });

    this.db = supabaseClient;
    this.initialized = false;
  }

  /**
   * Inicializa el sistema (carga modelo de embeddings)
   */
  async initialize() {
    if (this.initialized) return;

    console.log('[MemorySystem] Inicializando...');
    await this.embedder.initialize();
    this.initialized = true;
    console.log('[MemorySystem] Listo ✓');
  }

  // ========================================
  // GUARDAR MEMORIAS
  // ========================================

  /**
   * Guarda una memoria
   * 
   * @param {Object} memory - Datos de la memoria
   * @returns {Promise<Object>} Memoria guardada
   */
  async remember(memory) {
    await this.initialize();
    return this.store.save(memory);
  }

  /**
   * Guarda una conversación (mensaje + respuesta)
   * 
   * @param {Object} conversation - Datos de la conversación
   * @param {string} conversation.userId - ID del usuario
   * @param {string} conversation.userMessage - Mensaje del usuario
   * @param {string} conversation.botResponse - Respuesta del bot
   * @param {Object} conversation.metadata - Metadata adicional
   */
  async rememberConversation(conversation) {
    const { userId, userMessage, botResponse, metadata = {} } = conversation;

    await this.initialize();

    // Guardar mensaje del usuario
    await this.store.save({
      userId,
      content: `Usuario: ${userMessage}`,
      type: 'conversation',
      metadata: { ...metadata, role: 'user' },
    });

    // Guardar respuesta del bot
    await this.store.save({
      userId,
      content: `Bot: ${botResponse}`,
      type: 'conversation',
      metadata: { ...metadata, role: 'assistant' },
    });

    console.log(`[MemorySystem] Conversación guardada para ${userId}`);
  }

  /**
   * Guarda un hecho sobre el usuario
   * 
   * @param {string} userId - ID del usuario
   * @param {string} fact - Hecho a recordar
   * @param {Object} metadata - Metadata adicional
   */
  async rememberFact(userId, fact, metadata = {}) {
    await this.initialize();
    
    return this.store.save({
      userId,
      content: fact,
      type: 'fact',
      metadata: { ...metadata, isImportant: true },
    });
  }

  /**
   * Guarda una preferencia del usuario
   * 
   * @param {string} userId - ID del usuario
   * @param {string} preference - Preferencia
   */
  async rememberPreference(userId, preference) {
    await this.initialize();

    return this.store.save({
      userId,
      content: preference,
      type: 'preference',
    });
  }

  // ========================================
  // BUSCAR MEMORIAS
  // ========================================

  /**
   * Busca memorias relevantes
   * 
   * @param {Object} params - Parámetros de búsqueda
   * @returns {Promise<Array<Object>>} Memorias encontradas
   */
  async recall(params) {
    await this.initialize();
    return this.retriever.search(params);
  }

  /**
   * Obtiene contexto para el LLM
   * 
   * @param {string} userId - ID del usuario
   * @param {string} currentMessage - Mensaje actual
   * @param {number} maxTokens - Tokens máximos
   * @returns {Promise<string>} Contexto formateado
   */
  async getContext(userId, currentMessage, maxTokens = 500) {
    await this.initialize();

    return this.retriever.getContext({
      userId,
      query: currentMessage,
      maxTokens,
    });
  }

  /**
   * Obtiene memorias recientes
   * 
   * @param {string} userId - ID del usuario
   * @param {number} limit - Máximo de resultados
   * @returns {Promise<Array<Object>>} Memorias recientes
   */
  async getRecent(userId, limit = 10) {
    return this.retriever.getRecent(userId, limit);
  }

  /**
   * Obtiene hechos conocidos del usuario
   * 
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array<Object>>} Hechos
   */
  async getFacts(userId) {
    return this.retriever.getRecent(userId, 50, 'fact');
  }

  /**
   * Obtiene preferencias del usuario
   * 
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array<Object>>} Preferencias
   */
  async getPreferences(userId) {
    return this.retriever.getRecent(userId, 20, 'preference');
  }

  // ========================================
  // MANTENIMIENTO
  // ========================================

  /**
   * Limpia memorias antiguas
   * 
   * @param {string} userId - ID del usuario
   * @param {number} maxAgeDays - Días máximos
   */
  async cleanup(userId, maxAgeDays = 90) {
    return this.store.cleanup(userId, maxAgeDays);
  }

  /**
   * Elimina todas las memorias de un usuario
   * 
   * @param {string} userId - ID del usuario
   */
  async forget(userId) {
    const { error } = await this.db
      .from('memories')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error olvidando usuario: ${error.message}`);
    }

    console.log(`[MemorySystem] Memorias eliminadas para ${userId}`);
  }

  /**
   * Obtiene estadísticas de memoria
   * 
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas
   */
  async getStats(userId) {
    const { data, error } = await this.db
      .from('memories')
      .select('memory_type', { count: 'exact' })
      .eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    const { count: total } = await this.db
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      total,
      byType: data,
    };
  }
}

// Exports
module.exports = MemorySystem;
module.exports.MemorySystem = MemorySystem;
module.exports.MemoryStore = MemoryStore;
module.exports.MemoryRetriever = MemoryRetriever;
module.exports.createEmbedder = createEmbedder;
module.exports.STRATEGY_INFO = STRATEGY_INFO;
module.exports.EMBEDDING_DIMENSION = EMBEDDING_DIMENSION;
