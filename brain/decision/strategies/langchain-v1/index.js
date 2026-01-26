/**
 * DecisionMaker - Motor de decisiones con LangChain
 * 
 * Orquesta el proceso de decisión:
 * 1. Evaluator decide si responder (LLM)
 * 2. Planner define la estrategia (LLM)
 * 3. Scheduler controla el timing (Reglas)
 * 
 * @usage
 * const { DecisionMaker } = require('./brain/decision');
 * 
 * const dm = new DecisionMaker({ provider: 'groq' });
 * await dm.initialize();
 * 
 * const decision = await dm.decide(message, context);
 * // { action: 'respond', plan: {...}, timing: {...} }
 */

const { createModel } = require('./models');
const { Evaluator } = require('./evaluator');
const { Planner } = require('./planner');
const { Scheduler } = require('./scheduler');

// Metadata de la estrategia
const STRATEGY_INFO = {
  name: 'langchain-v1',
  version: '1.0.0',
  description: 'DecisionMaker con LangChain + Groq para evaluación y planificación',
  status: 'experimental',
  llmRequired: true,
  requirements: ['langchain', '@langchain/groq', '@langchain/core'],
};

class DecisionMaker {
  /**
   * @param {Object} options - Opciones de configuración
   * @param {string} options.provider - Proveedor LLM ('groq', 'openai', etc.)
   * @param {Object} options.evaluatorOptions - Opciones para Evaluator
   * @param {Object} options.plannerOptions - Opciones para Planner
   * @param {Object} options.schedulerOptions - Opciones para Scheduler
   */
  constructor(options = {}) {
    const {
      provider = 'groq',
      evaluatorOptions = {},
      plannerOptions = {},
      schedulerOptions = {},
    } = options;

    this.provider = provider;
    this.options = {
      evaluator: evaluatorOptions,
      planner: plannerOptions,
      scheduler: schedulerOptions,
    };

    // Se inicializan en initialize()
    this.model = null;
    this.evaluator = null;
    this.planner = null;
    this.scheduler = new Scheduler(schedulerOptions); // No necesita LLM

    this.initialized = false;
    
    // Stats
    this.stats = {
      decisionsProcessed: 0,
      responsesApproved: 0,
      responsesRejected: 0,
      errors: 0,
    };
  }

  /**
   * Inicializa el DecisionMaker (carga modelo LLM)
   */
  async initialize() {
    if (this.initialized) return;

    console.log(`[DecisionMaker] Inicializando con proveedor: ${this.provider}`);

    try {
      // Crear modelo LLM
      this.model = createModel(this.provider);

      // Crear evaluator y planner con el modelo
      this.evaluator = new Evaluator(this.model, this.options.evaluator);
      this.planner = new Planner(this.model, this.options.planner);

      this.initialized = true;
      console.log('[DecisionMaker] Inicializado ✓');

    } catch (error) {
      console.error('[DecisionMaker] Error inicializando:', error.message);
      throw error;
    }
  }

  /**
   * Toma una decisión sobre un mensaje
   * 
   * @param {Object} message - Mensaje a procesar
   * @param {string} message.author - Autor
   * @param {string} message.content - Contenido
   * @param {string} message.id - ID del mensaje
   * @param {boolean} message.isReply - Si es respuesta
   * @param {string[]} message.mentions - Menciones
   * @param {Object} context - Contexto adicional
   * @param {string} context.memoryContext - Contexto de memoria RAG
   * @param {Object} context.personalityTraits - Traits de personalidad
   * @returns {Promise<Object>} Decisión final
   */
  async decide(message, context = {}) {
    await this.initialize();

    this.stats.decisionsProcessed++;
    console.log(`[DecisionMaker] Procesando mensaje de @${message.author}`);

    try {
      // 1. Quick filter (sin LLM)
      const quickResult = this.evaluator.quickFilter(message);
      if (quickResult && !quickResult.shouldRespond) {
        console.log(`[DecisionMaker] Filtrado rápido: ${quickResult.reason}`);
        this.stats.responsesRejected++;
        return this._buildDecision('ignore', { evaluation: quickResult });
      }

      // 2. Evaluar con LLM
      const evaluation = await this.evaluator.evaluate(message, context);

      if (!evaluation.shouldRespond) {
        console.log(`[DecisionMaker] LLM dice ignorar: ${evaluation.reason}`);
        this.stats.responsesRejected++;
        return this._buildDecision('ignore', { evaluation });
      }

      // 3. Verificar timing
      const timing = this.scheduler.getOptimalTiming({
        priority: evaluation.priority,
        category: evaluation.category,
      });

      if (!timing.canRespond) {
        console.log(`[DecisionMaker] Timing no permite: ${timing.reason}`);
        return this._buildDecision('queue', { 
          evaluation,
          timing,
          retryAfter: timing.retryAfter,
        });
      }

      // 4. Planificar respuesta con LLM
      const plan = await this.planner.createPlan(message, evaluation, context);

      // 5. Registrar respuesta
      this.scheduler.recordResponse();
      this.stats.responsesApproved++;

      console.log(`[DecisionMaker] ✅ Decidido: RESPONDER con estrategia "${plan.strategy}"`);

      return this._buildDecision('respond', {
        evaluation,
        plan,
        timing,
      });

    } catch (error) {
      console.error('[DecisionMaker] Error:', error.message);
      this.stats.errors++;

      // En caso de error, decisión conservadora
      return this._buildDecision('ignore', {
        error: error.message,
        reason: 'Error en el proceso de decisión',
      });
    }
  }

  /**
   * Decisión rápida sin planificación (para testing)
   * 
   * @param {Object} message - Mensaje
   * @returns {Promise<Object>} Solo evaluación
   */
  async quickDecide(message) {
    await this.initialize();

    const quickResult = this.evaluator.quickFilter(message);
    if (quickResult) {
      return { shouldRespond: quickResult.shouldRespond, ...quickResult };
    }

    return this.evaluator.evaluate(message, {});
  }

  /**
   * Construye objeto de decisión estándar
   * @private
   */
  _buildDecision(action, data = {}) {
    return {
      action,
      ...data,
      metadata: {
        processedAt: new Date().toISOString(),
        provider: this.provider,
        strategy: STRATEGY_INFO.name,
      },
    };
  }

  /**
   * Obtiene estadísticas del DecisionMaker
   */
  getStats() {
    return {
      ...this.stats,
      scheduler: this.scheduler.getStats(),
      initialized: this.initialized,
      provider: this.provider,
    };
  }

  /**
   * Resetea estadísticas y cache
   */
  reset() {
    this.stats = {
      decisionsProcessed: 0,
      responsesApproved: 0,
      responsesRejected: 0,
      errors: 0,
    };
    this.evaluator?.clearCache();
    this.scheduler.reset();
  }
}

// Importar ResponseGenerator
const { ResponseGenerator } = require('./response-generator');

// Factory function para DecisionMaker
async function createDecisionMaker(options = {}) {
  const dm = new DecisionMaker(options);
  await dm.initialize();
  return dm;
}

// Factory function para ResponseGenerator
async function createResponseGenerator(options = {}) {
  const rg = new ResponseGenerator(options);
  await rg.initialize();
  return rg;
}

module.exports = DecisionMaker;
module.exports.DecisionMaker = DecisionMaker;
module.exports.createDecisionMaker = createDecisionMaker;
module.exports.ResponseGenerator = ResponseGenerator;
module.exports.createResponseGenerator = createResponseGenerator;
module.exports.Evaluator = Evaluator;
module.exports.Planner = Planner;
module.exports.Scheduler = Scheduler;
module.exports.STRATEGY_INFO = STRATEGY_INFO;

