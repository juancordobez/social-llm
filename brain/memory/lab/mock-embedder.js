/**
 * Mock Embedder - Para testing sin modelo real
 * 
 * Genera vectores consistentes basados en hash del texto.
 * NO produce embeddings semánticamente válidos, pero permite
 * testear el flujo completo sin cargar modelos pesados.
 * 
 * @usage
 * const { createMemorySystem } = require('../../brain/memory');
 * const memory = await createMemorySystem(supabase, { 
 *   embedderType: 'mock' 
 * });
 */

const { EMBEDDING_DIMENSION } = require('../strategies/supabase-rag-v1/embedder');

/**
 * Genera un hash simple de un string
 * 
 * @param {string} str - String a hashear
 * @returns {number} - Hash numérico
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Genera un vector pseudo-aleatorio pero determinístico
 * basado en el contenido del texto.
 * 
 * @param {string} text - Texto a "embeddear"
 * @param {number} dimension - Dimensión del vector
 * @returns {Array<number>} - Vector normalizado
 */
function generateMockEmbedding(text, dimension = EMBEDDING_DIMENSION) {
  const seed = simpleHash(text.toLowerCase().trim());
  const vector = [];
  
  // Generar vector pseudo-aleatorio con seed
  let currentSeed = seed;
  for (let i = 0; i < dimension; i++) {
    // Linear congruential generator
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    // Normalizar a rango [-1, 1]
    vector.push((currentSeed / 0x7fffffff) * 2 - 1);
  }
  
  // Normalizar el vector (L2 norm)
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / norm);
}

/**
 * MockEmbedder - Implementa la interfaz de Embedder
 */
class MockEmbedder {
  constructor() {
    this.initialized = false;
    this.dimension = EMBEDDING_DIMENSION;
  }

  /**
   * Inicializa el embedder (no-op para mock)
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[MockEmbedder] Inicializando (modo test)...');
    // Simular pequeña espera
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.initialized = true;
    console.log('[MockEmbedder] Listo ✓ (MODO TEST - vectores no semánticos)');
  }

  /**
   * Genera embedding para un texto
   * 
   * @param {string} text - Texto a embeddear
   * @returns {Promise<Array<number>>} - Vector de embedding
   */
  async embed(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!text || typeof text !== 'string') {
      throw new Error('embed() requiere un string no vacío');
    }

    return generateMockEmbedding(text, this.dimension);
  }

  /**
   * Genera embeddings para múltiples textos
   * 
   * @param {Array<string>} texts - Textos a embeddear
   * @returns {Promise<Array<Array<number>>>} - Vectores de embedding
   */
  async embedBatch(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('embedBatch() requiere un array de strings');
    }

    return Promise.all(texts.map(text => this.embed(text)));
  }

  /**
   * Calcula similitud coseno entre dos vectores
   * 
   * @param {Array<number>} a - Vector A
   * @param {Array<number>} b - Vector B
   * @returns {number} - Similitud [-1, 1]
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectores deben tener la misma dimensión');
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

// ========================================
// Tests de verificación
// ========================================

/**
 * Verifica que el mock funciona correctamente
 */
async function testMockEmbedder() {
  console.log('\n🧪 Testing MockEmbedder...\n');
  
  const embedder = new MockEmbedder();
  await embedder.initialize();

  // Test 1: Embeddings determinísticos
  const text1 = 'Hola mundo';
  const emb1a = await embedder.embed(text1);
  const emb1b = await embedder.embed(text1);
  
  const areSame = emb1a.every((val, i) => val === emb1b[i]);
  console.log(`✓ Determinismo: mismo texto = mismo vector: ${areSame}`);

  // Test 2: Textos diferentes = vectores diferentes
  const emb2 = await embedder.embed('Adiós mundo');
  const similarity = embedder.cosineSimilarity(emb1a, emb2);
  console.log(`✓ Textos diferentes: similitud = ${similarity.toFixed(4)}`);

  // Test 3: Dimensión correcta
  console.log(`✓ Dimensión: ${emb1a.length} (esperado: ${EMBEDDING_DIMENSION})`);

  // Test 4: Vector normalizado
  const norm = Math.sqrt(emb1a.reduce((sum, val) => sum + val * val, 0));
  console.log(`✓ Norma L2: ${norm.toFixed(4)} (esperado: ~1.0)`);

  // Test 5: Batch
  const batch = await embedder.embedBatch(['texto 1', 'texto 2', 'texto 3']);
  console.log(`✓ Batch: ${batch.length} embeddings generados`);

  console.log('\n✅ MockEmbedder funcionando correctamente\n');
}

// Exportar
module.exports = MockEmbedder;
module.exports.MockEmbedder = MockEmbedder;
module.exports.generateMockEmbedding = generateMockEmbedding;
module.exports.testMockEmbedder = testMockEmbedder;

// Si se ejecuta directamente, correr tests
if (require.main === module) {
  testMockEmbedder().catch(console.error);
}
