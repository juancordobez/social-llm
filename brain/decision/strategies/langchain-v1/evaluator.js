/**
 * Evaluator - Evalúa si el bot debe responder
 * 
 * Usa LangChain + Groq para decidir si un mensaje
 * merece una respuesta.
 * 
 * @usage
 * const evaluator = new Evaluator(model);
 * const result = await evaluator.evaluate(message, context);
 */

const { evaluatorPrompt } = require('./prompts');
const { EvaluationSchema, parseAndValidate } = require('./schemas');

class Evaluator {
  /**
   * @param {BaseChatModel} model - Modelo LangChain
   * @param {Object} options - Opciones
   */
  constructor(model, options = {}) {
    this.model = model;
    this.chain = evaluatorPrompt.pipe(model);
    
    // Configuración
    this.defaultTopics = options.topics || [
      'tecnología', 'programación', 'IA', 'startups', 'software'
    ];
    
    // Cache simple para evitar re-evaluar mensajes idénticos
    this.cache = new Map();
    this.cacheMaxSize = options.cacheSize || 100;
  }

  /**
   * Evalúa si debe responder a un mensaje
   * 
   * @param {Object} message - Mensaje a evaluar
   * @param {string} message.author - Autor del mensaje
   * @param {string} message.content - Contenido
   * @param {boolean} message.isReply - Si es respuesta a otro
   * @param {string[]} message.mentions - Menciones en el mensaje
   * @param {Object} context - Contexto adicional
   * @param {string} context.memoryContext - Contexto de memoria RAG
   * @returns {Promise<Object>} Evaluación
   */
  async evaluate(message, context = {}) {
    const { author, content, isReply = false, mentions = [] } = message;
    const { memoryContext = '' } = context;

    // Verificar cache
    const cacheKey = `${author}:${content}`;
    if (this.cache.has(cacheKey)) {
      console.log('[Evaluator] Cache hit');
      return this.cache.get(cacheKey);
    }

    console.log(`[Evaluator] Evaluando mensaje de @${author}`);

    try {
      // Invocar el chain
      const response = await this.chain.invoke({
        topics: this.defaultTopics.join(', '),
        author,
        content,
        isReply: isReply ? 'Sí, es respuesta a otro tweet' : 'No',
        mentions: mentions.length > 0 ? mentions.join(', ') : 'Ninguna',
        memoryContext: memoryContext || 'Sin contexto de conversaciones previas',
      });

      // Parsear y validar respuesta
      const evaluation = parseAndValidate(response.content, EvaluationSchema);

      // Guardar en cache
      this._addToCache(cacheKey, evaluation);

      console.log(`[Evaluator] Decisión: ${evaluation.shouldRespond ? '✅ RESPONDER' : '❌ IGNORAR'} (${evaluation.reason})`);

      return evaluation;

    } catch (error) {
      console.error('[Evaluator] Error:', error.message);
      
      // Fallback: responder si es mención directa
      return this._fallbackEvaluation(message);
    }
  }

  /**
   * Evaluación de emergencia cuando el LLM falla
   * @private
   */
  _fallbackEvaluation(message) {
    const isMention = message.mentions?.includes(process.env.TWITTER_BOT_USERNAME);
    const isQuestion = message.content?.includes('?');

    return {
      shouldRespond: isMention || isQuestion,
      confidence: 0.5,
      reason: 'Fallback: LLM no disponible',
      priority: isMention ? 0.7 : 0.3,
      category: isQuestion ? 'question' : 'mention',
    };
  }

  /**
   * Agrega a cache con límite de tamaño
   * @private
   */
  _addToCache(key, value) {
    if (this.cache.size >= this.cacheMaxSize) {
      // Eliminar el más antiguo
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Limpia el cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Evaluación rápida sin LLM (solo reglas)
   * Útil para filtrar antes de llamar al LLM
   * 
   * @param {Object} message - Mensaje
   * @returns {Object|null} - null si debe pasar al LLM
   */
  quickFilter(message) {
    const { content, author } = message;
    
    // Filtros rápidos que no necesitan LLM
    
    // 1. Muy corto (probablemente no es pregunta)
    if (content.length < 5) {
      return { shouldRespond: false, reason: 'Mensaje muy corto', category: 'spam' };
    }
    
    // 2. Solo emojis
    const emojiRegex = /^[\u{1F300}-\u{1F9FF}\s]+$/u;
    if (emojiRegex.test(content)) {
      return { shouldRespond: false, reason: 'Solo emojis', category: 'spam' };
    }
    
    // 3. Spam patterns
    const spamPatterns = [
      /follow\s*back/i,
      /f4f/i,
      /check\s*(my|out)/i,
      /free\s*(bitcoin|crypto|money)/i,
      /\$\$\$/,
    ];
    
    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return { shouldRespond: false, reason: 'Detectado como spam', category: 'spam' };
      }
    }
    
    // 4. Idioma no soportado (muy básico)
    const spanishWords = /\b(que|qué|como|cómo|por|para|esto|esta|hola|gracias)\b/i;
    const englishWords = /\b(what|how|why|this|that|hello|thanks|please)\b/i;
    
    if (!spanishWords.test(content) && !englishWords.test(content)) {
      // Podría ser otro idioma, dejar que el LLM decida
      return null;
    }
    
    // Pasar al LLM para evaluación completa
    return null;
  }
}

module.exports = { Evaluator };
