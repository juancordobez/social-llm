/**
 * Embedder - Convierte texto a vectores
 * 
 * Usa modelo local (transformers.js) para generar embeddings
 * sin depender de APIs externas.
 * 
 * Modelo: all-MiniLM-L6-v2 (384 dimensiones)
 * - Ligero (~80MB)
 * - Rápido
 * - Buena calidad para búsqueda semántica
 */

/**
 * Embedder usando transformers.js (local, sin API)
 */
class LocalEmbedder {
  constructor() {
    this.model = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.dimension = 384;
    this.initialized = false;
  }

  /**
   * Inicializa el modelo (lazy loading)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Importación dinámica de transformers.js
      const { pipeline } = await import('@xenova/transformers');
      
      console.log('[Embedder] Cargando modelo de embeddings...');
      this.model = await pipeline('feature-extraction', this.modelName);
      this.initialized = true;
      console.log('[Embedder] Modelo cargado ✓');
    } catch (error) {
      console.error('[Embedder] Error cargando modelo:', error.message);
      throw new Error(
        'No se pudo cargar el modelo de embeddings. ' +
        'Instala: npm install @xenova/transformers'
      );
    }
  }

  /**
   * Genera embedding para un texto
   * @param {string} text - Texto a convertir
   * @returns {Promise<number[]>} Vector de 384 dimensiones
   */
  async embed(text) {
    await this.initialize();

    if (!text || text.trim().length === 0) {
      throw new Error('Texto vacío');
    }

    // Truncar si es muy largo (max ~512 tokens)
    const truncated = text.slice(0, 2000);

    const output = await this.model(truncated, {
      pooling: 'mean',
      normalize: true,
    });

    // Convertir a array plano
    return Array.from(output.data);
  }

  /**
   * Genera embeddings para múltiples textos
   * @param {string[]} texts - Array de textos
   * @returns {Promise<number[][]>} Array de vectores
   */
  async embedBatch(texts) {
    const embeddings = [];
    
    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Calcula similitud coseno entre dos vectores
   * @param {number[]} a - Vector A
   * @param {number[]} b - Vector B
   * @returns {number} Similitud (0-1)
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectores de diferente dimensión');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Mock Embedder para testing
 * Genera vectores determinísticos basados en hash del texto
 */
class MockEmbedder {
  constructor() {
    this.dimension = 384;
    this.initialized = true;
  }

  async initialize() {
    // No necesita inicialización
  }

  async embed(text) {
    // Generar vector pseudo-aleatorio pero determinístico
    const hash = this._simpleHash(text);
    const vector = [];
    
    for (let i = 0; i < this.dimension; i++) {
      // Usar hash + índice para generar valores
      const value = Math.sin(hash + i * 0.1) * 0.5 + 0.5;
      vector.push(value);
    }

    // Normalizar
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / norm);
  }

  async embedBatch(texts) {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * Factory para crear embedder según configuración
 */
function createEmbedder(type = 'local') {
  switch (type) {
    case 'local':
      return new LocalEmbedder();
    case 'mock':
      return new MockEmbedder();
    default:
      console.warn(`[Embedder] Tipo "${type}" no soportado, usando mock`);
      return new MockEmbedder();
  }
}

module.exports = {
  LocalEmbedder,
  MockEmbedder,
  createEmbedder,
  EMBEDDING_DIMENSION: 384,
};
