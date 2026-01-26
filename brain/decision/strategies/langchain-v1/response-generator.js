/**
 * ResponseGenerator - Genera respuestas usando LangChain + Personalidad
 * 
 * Este módulo genera el contenido de las respuestas después de que
 * el DecisionMaker haya decidido responder.
 * 
 * Integra:
 * - Traits de personalidad del perfil
 * - Plan de respuesta del Planner (tono, estrategia, longitud)
 * - Contexto de memoria RAG
 * - Historial de conversación
 * 
 * @requires @langchain/groq
 */

const { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } = require('@langchain/core/prompts');
const { createModel } = require('./models');

/**
 * Templates de prompts para generación de respuestas
 */
const RESPONSE_PROMPTS = {
  // Prompt del sistema base
  system: `Eres un asistente de redes sociales que escribe como una persona real.

PERSONALIDAD DEL PERFIL:
{personality_description}

TEMAS DE EXPERTISE: {topics}

VOCABULARIO CARACTERÍSTICO: {vocabulary}

REGLAS IMPORTANTES:
- Escribe como si FUERAS esta persona, no la describas
- Sé auténtico y consistente con la personalidad
- NO uses hashtags a menos que sean muy relevantes
- NO uses más de 2 emojis por mensaje
- El mensaje debe tener sentido por sí solo (sin contexto visible)`,

  // Template para respuestas a menciones
  reply: `CONTEXTO DE LA CONVERSACIÓN:
{conversation_context}

{memory_context}

MENSAJE A RESPONDER:
@{author}: "{message}"

INSTRUCCIONES DE RESPUESTA:
- Estrategia: {strategy}
- Tono: {tone}
- Longitud: {length} ({length_hint})

Genera una respuesta natural. SOLO el texto de la respuesta, sin comillas ni prefijos.`,

  // Template para tweets originales
  tweet: `CONTEXTO:
{context}

{memory_context}

INSTRUCCIONES:
- Tema principal: {topic}
- Tono: {tone}
- Objetivo: {objective}

Genera un tweet original sobre este tema. SOLO el texto del tweet, sin comillas.
Máximo 280 caracteres.`,

  // Template para engagement proactivo
  engage: `TWEET ORIGINAL:
@{author}: "{message}"

PERFIL DEL AUTOR:
{author_context}

{memory_context}

INSTRUCCIONES:
- Tipo de interacción: {strategy}
- Tono: {tone}
- Longitud: {length}

Genera un comentario o respuesta que aporte valor a la conversación.
SOLO el texto, sin comillas ni prefijos.`,
};

/**
 * Descripciones de tono basadas en el plan
 */
const TONE_DESCRIPTIONS = {
  casual: 'relajado, amigable, como hablar con un conocido',
  professional: 'profesional pero cercano, evita jerga excesiva',
  enthusiastic: 'entusiasta y positivo, muestra interés genuino',
  empathetic: 'comprensivo y solidario, valida sentimientos',
  humorous: 'con toques de humor sutil, sin forzarlo',
  helpful: 'servicial y práctico, enfocado en aportar valor',
  curious: 'haciendo preguntas, mostrando interés genuino',
};

/**
 * Hints de longitud
 */
const LENGTH_HINTS = {
  short: '1-2 oraciones, máximo 80 caracteres',
  medium: '2-3 oraciones, entre 80-180 caracteres',
  long: '3-4 oraciones, entre 180-280 caracteres',
};

/**
 * ResponseGenerator - Genera respuestas con personalidad
 */
class ResponseGenerator {
  constructor(config = {}) {
    this.provider = config.provider || 'groq';
    this.model = null;
    this.traits = config.traits || null;
    
    // Config de generación
    this.config = {
      temperature: config.temperature || 0.8, // Más creatividad
      maxTokens: config.maxTokens || 300,
      maxRetries: config.maxRetries || 2,
    };
    
    // Stats
    this.stats = {
      generated: 0,
      errors: 0,
      avgLength: 0,
    };
  }

  /**
   * Inicializar el generador
   */
  async initialize() {
    this.model = createModel(this.provider, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
    
    console.log(`[ResponseGenerator] Inicializado con proveedor: ${this.provider}`);
    return this;
  }

  /**
   * Cargar traits de personalidad
   * @param {Object} traits - Traits del perfil
   */
  loadTraits(traits) {
    this.traits = traits;
    console.log(`[ResponseGenerator] Traits cargados para: ${traits.topics?.join(', ') || 'perfil'}`);
  }

  /**
   * Generar respuesta a una mención
   * 
   * @param {Object} mention - Mensaje a responder
   * @param {Object} plan - Plan del DecisionMaker (tono, estrategia, longitud)
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Respuesta generada
   */
  async generateReply(mention, plan, context = {}) {
    console.log(`[ResponseGenerator] Generando respuesta para @${mention.author}`);
    
    if (!this.model) {
      throw new Error('ResponseGenerator no inicializado. Llama a initialize() primero.');
    }

    const systemPrompt = this._buildSystemPrompt();
    const userPrompt = this._buildReplyPrompt(mention, plan, context);

    try {
      const response = await this._generate(systemPrompt, userPrompt);
      
      // Validar y limpiar respuesta
      const cleaned = this._cleanResponse(response, 'reply');
      
      this.stats.generated++;
      this._updateAvgLength(cleaned.length);

      return {
        content: cleaned,
        type: 'reply',
        plan,
        metadata: {
          author: mention.author,
          originalMessage: mention.content?.slice(0, 100),
          generatedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      this.stats.errors++;
      console.error(`[ResponseGenerator] Error:`, error.message);
      
      // Fallback a respuesta genérica
      return this._getFallbackResponse(mention, plan);
    }
  }

  /**
   * Generar tweet original
   * 
   * @param {Object} options - Opciones del tweet
   * @returns {Promise<Object>} Tweet generado
   */
  async generateTweet(options = {}) {
    const { topic, tone = 'casual', objective = 'engagement', context = '' } = options;
    
    console.log(`[ResponseGenerator] Generando tweet sobre: ${topic}`);

    const systemPrompt = this._buildSystemPrompt();
    const userPrompt = this._buildTweetPrompt(topic, tone, objective, context);

    try {
      const response = await this._generate(systemPrompt, userPrompt);
      const cleaned = this._cleanResponse(response, 'tweet');
      
      this.stats.generated++;
      this._updateAvgLength(cleaned.length);

      return {
        content: cleaned,
        type: 'tweet',
        metadata: {
          topic,
          tone,
          generatedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Generar respuesta de engagement proactivo
   */
  async generateEngagement(tweet, plan, authorContext = {}) {
    console.log(`[ResponseGenerator] Generando engagement para @${tweet.author}`);

    const systemPrompt = this._buildSystemPrompt();
    const userPrompt = this._buildEngagePrompt(tweet, plan, authorContext);

    try {
      const response = await this._generate(systemPrompt, userPrompt);
      const cleaned = this._cleanResponse(response, 'engage');
      
      this.stats.generated++;

      return {
        content: cleaned,
        type: 'engagement',
        plan,
        metadata: {
          author: tweet.author,
          generatedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  // ==================== BUILDERS ====================

  /**
   * Construir system prompt basado en traits
   * @private
   */
  _buildSystemPrompt() {
    const traits = this.traits || this._getDefaultTraits();
    
    const personalityDesc = this._describePersonality(traits);
    const topics = traits.topics?.join(', ') || 'general';
    const vocabulary = traits.vocabulary?.join(', ') || '';

    return RESPONSE_PROMPTS.system
      .replace('{personality_description}', personalityDesc)
      .replace('{topics}', topics)
      .replace('{vocabulary}', vocabulary);
  }

  /**
   * Construir prompt para reply
   * @private
   */
  _buildReplyPrompt(mention, plan, context) {
    const toneDesc = TONE_DESCRIPTIONS[plan.tone] || plan.tone;
    const lengthHint = LENGTH_HINTS[plan.length] || plan.length;
    
    const memoryContext = context.memoryContext 
      ? `HISTORIAL CON ESTE USUARIO:\n${context.memoryContext}`
      : '';

    const conversationContext = context.conversation
      ? `Conversación previa:\n${context.conversation}`
      : '';

    return RESPONSE_PROMPTS.reply
      .replace('{conversation_context}', conversationContext)
      .replace('{memory_context}', memoryContext)
      .replace('{author}', mention.author)
      .replace('{message}', mention.content)
      .replace('{strategy}', plan.strategy)
      .replace('{tone}', toneDesc)
      .replace('{length}', plan.length)
      .replace('{length_hint}', lengthHint);
  }

  /**
   * Construir prompt para tweet
   * @private
   */
  _buildTweetPrompt(topic, tone, objective, context) {
    const toneDesc = TONE_DESCRIPTIONS[tone] || tone;
    
    return RESPONSE_PROMPTS.tweet
      .replace('{context}', context || 'Sin contexto adicional')
      .replace('{memory_context}', '')
      .replace('{topic}', topic)
      .replace('{tone}', toneDesc)
      .replace('{objective}', objective);
  }

  /**
   * Construir prompt para engagement
   * @private
   */
  _buildEngagePrompt(tweet, plan, authorContext) {
    const toneDesc = TONE_DESCRIPTIONS[plan.tone] || plan.tone;
    
    const authorInfo = authorContext.bio 
      ? `Bio: ${authorContext.bio}\nTemas: ${authorContext.topics?.join(', ') || 'desconocido'}`
      : 'Información no disponible';

    return RESPONSE_PROMPTS.engage
      .replace('{author}', tweet.author)
      .replace('{message}', tweet.content)
      .replace('{author_context}', authorInfo)
      .replace('{memory_context}', '')
      .replace('{strategy}', plan.strategy)
      .replace('{tone}', toneDesc)
      .replace('{length}', plan.length);
  }

  // ==================== HELPERS ====================

  /**
   * Ejecutar generación con el modelo
   * @private
   */
  async _generate(systemPrompt, userPrompt) {
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemPrompt),
      HumanMessagePromptTemplate.fromTemplate(userPrompt),
    ]);

    const chain = prompt.pipe(this.model);
    
    // LangChain devuelve AIMessage
    const result = await chain.invoke({});
    
    return result.content;
  }

  /**
   * Limpiar y validar respuesta
   * @private
   */
  _cleanResponse(response, type) {
    let cleaned = response
      .trim()
      // Quitar comillas envolventes
      .replace(/^["']|["']$/g, '')
      // Quitar prefijos comunes
      .replace(/^(respuesta:|response:|reply:)\s*/i, '')
      // Quitar @menciones duplicadas al inicio
      .replace(/^@\w+\s+/i, '')
      // Limitar emojis consecutivos
      .replace(/([\u{1F600}-\u{1F6FF}])\1+/gu, '$1');

    // Validar longitud para Twitter
    if (type === 'tweet' || type === 'reply') {
      if (cleaned.length > 280) {
        // Truncar inteligentemente
        cleaned = this._smartTruncate(cleaned, 280);
      }
    }

    return cleaned;
  }

  /**
   * Truncar manteniendo sentido
   * @private
   */
  _smartTruncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Buscar último punto o espacio antes del límite
    let cutoff = maxLength - 3; // Para "..."
    const lastPeriod = text.lastIndexOf('.', cutoff);
    const lastSpace = text.lastIndexOf(' ', cutoff);
    
    if (lastPeriod > cutoff * 0.6) {
      return text.slice(0, lastPeriod + 1);
    }
    
    if (lastSpace > cutoff * 0.7) {
      return text.slice(0, lastSpace) + '...';
    }
    
    return text.slice(0, cutoff) + '...';
  }

  /**
   * Describir personalidad basada en traits
   * @private
   */
  _describePersonality(traits) {
    const descriptions = [];
    const tone = traits.tone || {};
    
    // Formalidad
    if (tone.formality < 0.3) descriptions.push('casual y relajado');
    else if (tone.formality > 0.7) descriptions.push('profesional y formal');
    else descriptions.push('conversacional');

    // Humor
    if (tone.humor > 0.6) descriptions.push('con buen humor');
    else if (tone.humor < 0.3) descriptions.push('serio y enfocado');

    // Entusiasmo
    if (tone.enthusiasm > 0.7) descriptions.push('entusiasta y energético');
    else if (tone.enthusiasm < 0.3) descriptions.push('calmado y mesurado');

    // Empatía
    if (tone.empathy > 0.7) descriptions.push('empático y comprensivo');
    else if (tone.empathy < 0.3) descriptions.push('directo y al punto');

    return descriptions.join(', ');
  }

  /**
   * Traits por defecto
   * @private
   */
  _getDefaultTraits() {
    return {
      tone: {
        formality: 0.4,
        humor: 0.5,
        enthusiasm: 0.6,
        empathy: 0.7,
      },
      topics: ['tecnología', 'programación', 'startups'],
      vocabulary: ['interesante', 'genial', 'vale', 'mira'],
    };
  }

  /**
   * Respuesta de fallback
   * @private
   */
  _getFallbackResponse(mention, plan) {
    const fallbacks = {
      answer: '¡Interesante pregunta! Dame un momento para pensarlo mejor 🤔',
      engage: '¡Qué bueno! Me encanta ver este tipo de contenido 👍',
      opinion: 'Buen punto, aunque hay diferentes perspectivas al respecto.',
      support: '¡Ánimo! Estoy seguro de que lo harás genial 💪',
      humor: 'Jaja, eso me hizo sonreír 😄',
    };

    return {
      content: fallbacks[plan.strategy] || '¡Gracias por tu mensaje! 🙌',
      type: 'reply',
      plan,
      isFallback: true,
      metadata: {
        author: mention.author,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Actualizar promedio de longitud
   * @private
   */
  _updateAvgLength(length) {
    const total = this.stats.avgLength * (this.stats.generated - 1) + length;
    this.stats.avgLength = Math.round(total / this.stats.generated);
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = { ResponseGenerator };
