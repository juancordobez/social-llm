/**
 * PersonalityEngine v1 - Engine Principal
 * 
 * Orquestador que coordina análisis, generación y scoring.
 * Esta es la API pública del módulo de personalidad.
 * 
 * ESTRATEGIA v1: Traits numéricos (0-1)
 * - Ventaja: Simple, rápido, bajo consumo de tokens
 * - Limitación: Pierde matices de personalidad
 * 
 * @version 1.0.0-experimental
 */

const { DEFAULT_TRAITS, validateTraits, mergeWithDefaults } = require('./traits');
const { analyzeFromSamples, combineTraits } = require('./analyzer');
const { generateContent, generateVariations } = require('./generator');
const { scoreContent, selectBest, passesThreshold } = require('./scorer');

/**
 * PersonalityEngine - Motor de personalidad
 * 
 * @example
 * const engine = new PersonalityEngine(groqClient);
 * await engine.learn(userPosts);
 * const tweet = await engine.generate({ topic: 'tech' });
 */
class PersonalityEngine {
  /**
   * @param {Object} llmClient - Cliente LLM (Groq, OpenAI, etc)
   * @param {Object} options - Configuración
   * @param {string} options.model - Modelo a usar
   * @param {number} options.minConfidence - Confianza mínima para publicar
   */
  constructor(llmClient, options = {}) {
    if (!llmClient) {
      throw new Error('PersonalityEngine requiere un cliente LLM');
    }

    this.llm = llmClient;
    this.model = options.model || 'llama-3.1-70b-versatile';
    this.minConfidence = options.minConfidence || 0.6;
    
    // Estado interno
    this.traits = null;
    this.learnedFrom = 0;
    this.initialized = false;
  }

  /**
   * Aprende personalidad de muestras de contenido
   * 
   * @param {Array<string>} samples - Posts de ejemplo
   * @param {Object} options - Opciones
   * @param {string} options.bio - Bio del usuario
   * @param {boolean} options.cumulative - Combinar con traits existentes
   * @returns {Promise<Object>} Traits aprendidos
   */
  async learn(samples, options = {}) {
    const { bio = '', cumulative = false } = options;

    console.log(`[PersonalityEngine] Aprendiendo de ${samples.length} samples...`);

    const newTraits = await analyzeFromSamples(
      this.llm, 
      samples, 
      { bio, model: this.model }
    );

    if (cumulative && this.traits) {
      // Combinar con traits existentes
      this.traits = combineTraits([this.traits, newTraits]);
    } else {
      this.traits = newTraits;
    }

    this.learnedFrom += samples.length;
    this.initialized = true;

    console.log(`[PersonalityEngine] Aprendizaje completo. Confianza: ${this.traits.confidence}`);

    return this.traits;
  }

  /**
   * Carga traits previamente guardados
   * 
   * @param {Object} traits - Traits a cargar
   * @returns {PersonalityEngine} this (para encadenar)
   */
  loadTraits(traits) {
    if (!validateTraits(traits)) {
      console.warn('[PersonalityEngine] Traits inválidos, usando defaults');
      this.traits = mergeWithDefaults(traits);
    } else {
      this.traits = traits;
    }
    
    this.initialized = true;
    return this;
  }

  /**
   * Exporta traits para guardar
   * 
   * @returns {Object} Traits actuales
   */
  exportTraits() {
    if (!this.initialized) {
      throw new Error('Engine no inicializado. Usa learn() o loadTraits() primero.');
    }
    return { ...this.traits };
  }

  /**
   * Genera contenido imitando la personalidad
   * 
   * @param {Object} request - Solicitud de contenido
   * @param {string} request.type - 'post', 'reply', 'comment', 'thread'
   * @param {string} request.topic - Tema
   * @param {string} request.context - Contexto adicional
   * @param {string} request.platform - twitter, linkedin, etc
   * @param {Object} options - Opciones
   * @param {boolean} options.withScore - Incluir score en respuesta
   * @returns {Promise<string|Object>} Contenido o { content, score }
   */
  async generate(request, options = {}) {
    this._ensureInitialized();

    const { withScore = false } = options;

    const content = await generateContent(
      this.llm,
      this.traits,
      request,
      { model: this.model }
    );

    if (withScore) {
      const score = await scoreContent(this.llm, content, this.traits);
      return { content, score };
    }

    return content;
  }

  /**
   * Genera y selecciona el mejor contenido
   * 
   * @param {Object} request - Solicitud de contenido
   * @param {number} variations - Cantidad de variaciones a generar
   * @returns {Promise<Object>} { content, score }
   */
  async generateBest(request, variations = 3) {
    this._ensureInitialized();

    const options = generateVariations(
      this.llm,
      this.traits,
      request,
      variations
    );

    return selectBest(this.llm, options, this.traits);
  }

  /**
   * Evalúa qué tan auténtico es un contenido
   * 
   * @param {string} content - Contenido a evaluar
   * @returns {Promise<Object>} Score con detalles
   */
  async evaluate(content) {
    this._ensureInitialized();

    return scoreContent(this.llm, content, this.traits);
  }

  /**
   * Verifica si contenido pasa el umbral de autenticidad
   * 
   * @param {string} content - Contenido a verificar
   * @returns {Promise<boolean>} true si pasa umbral
   */
  async isAuthentic(content) {
    const score = await this.evaluate(content);
    return passesThreshold(score, this.minConfidence);
  }

  /**
   * Obtiene resumen de la personalidad
   * 
   * @returns {string} Resumen legible
   */
  getSummary() {
    this._ensureInitialized();

    return this.traits.summary || 'Personalidad cargada sin resumen.';
  }

  /**
   * Obtiene estadísticas del engine
   * 
   * @returns {Object} Stats
   */
  getStats() {
    return {
      initialized: this.initialized,
      learnedFrom: this.learnedFrom,
      confidence: this.traits?.confidence || 0,
      topics: this.traits?.topics || [],
    };
  }

  /**
   * Resetea el engine
   */
  reset() {
    this.traits = null;
    this.learnedFrom = 0;
    this.initialized = false;
  }

  // --- Métodos privados ---

  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error(
        'PersonalityEngine no inicializado. ' +
        'Usa learn(samples) o loadTraits(traits) primero.'
      );
    }
  }
}

module.exports = PersonalityEngine;
