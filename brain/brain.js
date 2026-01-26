/**
 * Brain - Orquestador central de inteligencia
 * 
 * Integra todos los componentes del sistema de decisión y respuesta:
 * - DecisionMaker: Decide si responder y cómo
 * - ResponseGenerator: Genera el contenido de las respuestas
 * - MemorySystem: Contexto de conversaciones pasadas
 * 
 * @usage
 * const { Brain } = require('../brain');
 * 
 * const brain = new Brain({ provider: 'groq' });
 * await brain.initialize();
 * brain.loadTraits(profileTraits);
 * 
 * // Procesar una mención completa
 * const result = await brain.process(mention, context);
 * // { action: 'respond', response: '...', plan: {...}, timing: {...} }
 */

const { createDecisionMaker, createResponseGenerator } = require('./decision');

class Brain {
  /**
   * @param {Object} options - Opciones de configuración
   * @param {string} options.provider - Proveedor LLM ('groq', 'openai')
   * @param {Object} options.traits - Traits de personalidad iniciales
   * @param {Object} options.memory - Instancia de MemorySystem (opcional)
   * @param {Object} options.decisionOptions - Opciones para DecisionMaker
   * @param {Object} options.generatorOptions - Opciones para ResponseGenerator
   */
  constructor(options = {}) {
    this.provider = options.provider || 'groq';
    this.traits = options.traits || null;
    this.memory = options.memory || null;
    
    this.options = {
      decision: options.decisionOptions || {},
      generator: options.generatorOptions || {},
    };

    // Componentes (se inicializan en initialize())
    this.decisionMaker = null;
    this.responseGenerator = null;
    
    this.initialized = false;
    
    // Stats agregadas
    this.stats = {
      processed: 0,
      responded: 0,
      ignored: 0,
      errors: 0,
      startTime: null,
    };
  }

  /**
   * Inicializa todos los componentes
   */
  async initialize() {
    if (this.initialized) return this;

    console.log('[Brain] Inicializando componentes...');
    this.stats.startTime = new Date();

    try {
      // Inicializar DecisionMaker y ResponseGenerator en paralelo
      const [dm, rg] = await Promise.all([
        createDecisionMaker({
          provider: this.provider,
          ...this.options.decision,
        }),
        createResponseGenerator({
          provider: this.provider,
          ...this.options.generator,
        }),
      ]);

      this.decisionMaker = dm;
      this.responseGenerator = rg;

      // Cargar traits si fueron proporcionados
      if (this.traits) {
        this.loadTraits(this.traits);
      }

      this.initialized = true;
      console.log('[Brain] ✅ Inicializado correctamente');

    } catch (error) {
      console.error('[Brain] Error inicializando:', error.message);
      throw error;
    }

    return this;
  }

  /**
   * Cargar traits de personalidad
   * @param {Object} traits - Traits del perfil
   */
  loadTraits(traits) {
    this.traits = traits;
    
    if (this.responseGenerator) {
      this.responseGenerator.loadTraits(traits);
    }
    
    console.log('[Brain] Traits cargados');
  }

  /**
   * Configurar sistema de memoria
   * @param {Object} memorySystem - Instancia de MemorySystem
   */
  setMemory(memorySystem) {
    this.memory = memorySystem;
    console.log('[Brain] MemorySystem configurado');
  }

  /**
   * Procesa un mensaje y decide si/cómo responder
   * 
   * Este es el método principal que orquesta todo el flujo:
   * 1. Decide si responder (DecisionMaker)
   * 2. Si responde, genera contenido (ResponseGenerator)
   * 3. Opcionalmente guarda en memoria
   * 
   * @param {Object} message - Mensaje a procesar
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async process(message, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    this.stats.processed++;
    
    console.log(`[Brain] Procesando mensaje de @${message.author || 'unknown'}`);

    try {
      // 1. Obtener contexto de memoria si está disponible
      let memoryContext = '';
      if (this.memory && message.author) {
        try {
          memoryContext = await this.memory.getContext(
            message.author,
            message.content,
            300
          );
        } catch (e) {
          console.warn('[Brain] Memory retrieval failed:', e.message);
        }
      }

      // Enriquecer contexto
      const enrichedContext = {
        ...context,
        memoryContext,
      };

      // 2. Decidir si responder y cómo
      const decision = await this.decisionMaker.decide(message, enrichedContext);

      // 3. Si no debe responder, retornar early
      if (decision.action === 'ignore') {
        this.stats.ignored++;
        
        return {
          action: 'ignore',
          reason: decision.evaluation?.reason || 'DecisionMaker decidió ignorar',
          stats: this._getProcessStats(),
        };
      }

      // 4. Verificar timing del Scheduler
      if (!decision.timing?.canRespond) {
        this.stats.ignored++;
        
        return {
          action: 'delayed',
          reason: decision.timing?.reason || 'Rate limit alcanzado',
          retryAfter: decision.timing?.delay || 60000,
          stats: this._getProcessStats(),
        };
      }

      // 5. Generar respuesta
      const response = await this.responseGenerator.generateReply(
        message,
        decision.plan,
        enrichedContext
      );

      this.stats.responded++;

      // 6. Preparar resultado
      return {
        action: 'respond',
        response: response.content,
        plan: decision.plan,
        timing: decision.timing,
        evaluation: decision.evaluation,
        isFallback: response.isFallback || false,
        stats: this._getProcessStats(),
      };

    } catch (error) {
      this.stats.errors++;
      console.error('[Brain] Error procesando:', error.message);

      return {
        action: 'error',
        error: error.message,
        stats: this._getProcessStats(),
      };
    }
  }

  /**
   * Generar tweet original (sin responder a nadie)
   * 
   * @param {Object} options - Opciones del tweet
   * @returns {Promise<Object>} Tweet generado
   */
  async generateTweet(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.responseGenerator.generateTweet(options);
  }

  /**
   * Evaluar rápidamente si un mensaje es respondible
   * Sin hacer decisión completa (para filtrado masivo)
   */
  async quickFilter(message) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.decisionMaker.quickDecide(message);
  }

  /**
   * Guardar interacción en memoria
   * 
   * @param {Object} interaction - Datos de la interacción
   */
  async saveInteraction(interaction) {
    if (!this.memory) {
      console.warn('[Brain] No hay MemorySystem configurado');
      return;
    }

    try {
      await this.memory.add({
        userId: interaction.userId,
        type: interaction.type || 'reply',
        content: interaction.content,
        metadata: interaction.metadata,
      });
      
      console.log('[Brain] Interacción guardada en memoria');
    } catch (error) {
      console.error('[Brain] Error guardando en memoria:', error.message);
    }
  }

  /**
   * Obtener estadísticas del procesamiento
   * @private
   */
  _getProcessStats() {
    return {
      processed: this.stats.processed,
      responded: this.stats.responded,
      ignored: this.stats.ignored,
      responseRate: this.stats.processed > 0 
        ? Math.round((this.stats.responded / this.stats.processed) * 100) 
        : 0,
    };
  }

  /**
   * Obtener estadísticas completas
   */
  getStats() {
    const dmStats = this.decisionMaker?.getStats() || {};
    const rgStats = this.responseGenerator?.getStats() || {};
    
    return {
      brain: this.stats,
      decisionMaker: dmStats,
      responseGenerator: rgStats,
      uptime: this.stats.startTime 
        ? Date.now() - this.stats.startTime.getTime()
        : 0,
    };
  }

  /**
   * Reset de estadísticas
   */
  reset() {
    this.stats = {
      processed: 0,
      responded: 0,
      ignored: 0,
      errors: 0,
      startTime: new Date(),
    };
    
    this.decisionMaker?.reset();
  }
}

/**
 * Factory function para crear Brain
 */
async function createBrain(options = {}) {
  const brain = new Brain(options);
  await brain.initialize();
  return brain;
}

module.exports = { Brain, createBrain };
