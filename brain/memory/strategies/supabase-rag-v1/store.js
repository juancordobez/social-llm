/**
 * Store - Guarda memorias en Supabase
 * 
 * Responsabilidades:
 * - Insertar nuevas memorias con embeddings
 * - Actualizar memorias existentes
 * - Eliminar memorias antiguas (cleanup)
 */

const { EMBEDDING_DIMENSION } = require('./embedder');

/**
 * MemoryStore - Almacenamiento de memorias en Supabase
 */
class MemoryStore {
  /**
   * @param {Object} supabaseClient - Cliente de Supabase
   * @param {Object} embedder - Instancia de embedder
   */
  constructor(supabaseClient, embedder) {
    if (!supabaseClient) {
      throw new Error('MemoryStore requiere cliente Supabase');
    }
    if (!embedder) {
      throw new Error('MemoryStore requiere embedder');
    }

    this.db = supabaseClient;
    this.embedder = embedder;
    this.tableName = 'memories';
  }

  /**
   * Guarda una nueva memoria
   * 
   * @param {Object} memory - Datos de la memoria
   * @param {string} memory.userId - ID del usuario
   * @param {string} memory.content - Contenido textual
   * @param {string} memory.type - Tipo: 'conversation', 'fact', 'preference', 'interaction'
   * @param {Object} memory.metadata - Metadata adicional
   * @param {string} memory.platform - Plataforma origen
   * @returns {Promise<Object>} Memoria guardada
   */
  async save(memory) {
    const { userId, content, type = 'conversation', metadata = {}, platform = 'twitter' } = memory;

    if (!userId || !content) {
      throw new Error('userId y content son requeridos');
    }

    // Generar embedding
    let embedding = null;
    try {
      embedding = await this.embedder.embed(content);
    } catch (error) {
      console.warn('[MemoryStore] Error generando embedding:', error.message);
      // Continuamos sin embedding (búsqueda semántica no funcionará)
    }

    // Insertar en Supabase
    const { data, error } = await this.db
      .from(this.tableName)
      .insert({
        user_id: userId,
        content,
        embedding,
        memory_type: type,
        metadata,
        platform,
        importance: this._calculateImportance(type, metadata),
      })
      .select()
      .single();

    if (error) {
      console.error('[MemoryStore] Error guardando memoria:', error);
      throw new Error(`Error guardando memoria: ${error.message}`);
    }

    console.log(`[MemoryStore] Memoria guardada: ${data.id}`);
    return data;
  }

  /**
   * Guarda múltiples memorias en batch
   * 
   * @param {Array<Object>} memories - Array de memorias
   * @returns {Promise<Array<Object>>} Memorias guardadas
   */
  async saveBatch(memories) {
    if (!memories || memories.length === 0) {
      return [];
    }

    // Generar embeddings en batch
    const contents = memories.map(m => m.content);
    let embeddings = [];
    
    try {
      embeddings = await this.embedder.embedBatch(contents);
    } catch (error) {
      console.warn('[MemoryStore] Error en batch embeddings:', error.message);
      embeddings = memories.map(() => null);
    }

    // Preparar registros
    const records = memories.map((memory, i) => ({
      user_id: memory.userId,
      content: memory.content,
      embedding: embeddings[i],
      memory_type: memory.type || 'conversation',
      metadata: memory.metadata || {},
      platform: memory.platform || 'twitter',
      importance: this._calculateImportance(memory.type, memory.metadata),
    }));

    // Insertar batch
    const { data, error } = await this.db
      .from(this.tableName)
      .insert(records)
      .select();

    if (error) {
      console.error('[MemoryStore] Error en batch insert:', error);
      throw new Error(`Error guardando batch: ${error.message}`);
    }

    console.log(`[MemoryStore] ${data.length} memorias guardadas`);
    return data;
  }

  /**
   * Actualiza una memoria existente
   * 
   * @param {string} id - ID de la memoria
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Memoria actualizada
   */
  async update(id, updates) {
    const updateData = { ...updates };

    // Si se actualiza content, regenerar embedding
    if (updates.content) {
      try {
        updateData.embedding = await this.embedder.embed(updates.content);
      } catch (error) {
        console.warn('[MemoryStore] Error actualizando embedding:', error.message);
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando memoria: ${error.message}`);
    }

    return data;
  }

  /**
   * Marca una memoria como accedida (para decay)
   * 
   * @param {string} id - ID de la memoria
   */
  async markAccessed(id) {
    await this.db
      .from(this.tableName)
      .update({
        access_count: this.db.sql`access_count + 1`,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  /**
   * Elimina una memoria
   * 
   * @param {string} id - ID de la memoria
   */
  async delete(id) {
    const { error } = await this.db
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error eliminando memoria: ${error.message}`);
    }
  }

  /**
   * Elimina memorias antiguas (cleanup)
   * 
   * @param {string} userId - ID del usuario
   * @param {number} maxAgeDays - Máximo de días a conservar
   * @param {number} maxCount - Máximo de memorias a conservar
   */
  async cleanup(userId, maxAgeDays = 90, maxCount = 1000) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    // Eliminar por antigüedad
    await this.db
      .from(this.tableName)
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())
      .lt('importance', 0.8); // Mantener las importantes

    // Contar memorias restantes
    const { count } = await this.db
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Si aún hay demasiadas, eliminar las menos accedidas
    if (count > maxCount) {
      const toDelete = count - maxCount;
      
      const { data: oldMemories } = await this.db
        .from(this.tableName)
        .select('id')
        .eq('user_id', userId)
        .order('access_count', { ascending: true })
        .order('importance', { ascending: true })
        .limit(toDelete);

      if (oldMemories && oldMemories.length > 0) {
        const ids = oldMemories.map(m => m.id);
        await this.db
          .from(this.tableName)
          .delete()
          .in('id', ids);
      }
    }

    console.log(`[MemoryStore] Cleanup completado para usuario ${userId}`);
  }

  /**
   * Calcula importancia de una memoria
   * @private
   */
  _calculateImportance(type, metadata) {
    let importance = 0.5;

    // Ajustar por tipo
    switch (type) {
      case 'fact':
        importance = 0.8; // Hechos son importantes
        break;
      case 'preference':
        importance = 0.7;
        break;
      case 'interaction':
        importance = 0.4;
        break;
      case 'conversation':
      default:
        importance = 0.5;
    }

    // Ajustar por metadata
    if (metadata?.isImportant) importance += 0.2;
    if (metadata?.sentiment === 'negative') importance += 0.1;
    if (metadata?.hasQuestion) importance += 0.1;

    return Math.min(1, importance);
  }
}

module.exports = { MemoryStore };
