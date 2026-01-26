/**
 * DecisionMaker - Punto de entrada
 * 
 * Carga dinámicamente la estrategia de decisión configurada.
 * Por defecto: langchain-v1
 * 
 * @usage
 * const { DecisionMaker, createDecisionMaker } = require('../brain/decision');
 * 
 * // Opción 1: Con factory
 * const dm = await createDecisionMaker({ provider: 'groq' });
 * const decision = await dm.decide(message, context);
 * 
 * // Opción 2: Manual
 * const dm = new DecisionMaker({ provider: 'groq' });
 * await dm.initialize();
 */

// Estrategias disponibles
const AVAILABLE_STRATEGIES = {
  'langchain-v1': './strategies/langchain-v1',
};

// Estrategia por defecto
const DEFAULT_STRATEGY = 'langchain-v1';

/**
 * Carga una estrategia de decisión
 * 
 * @param {string} strategyName - Nombre de la estrategia
 * @returns {Object} Módulo de la estrategia
 */
function loadStrategy(strategyName = DEFAULT_STRATEGY) {
  const strategyPath = AVAILABLE_STRATEGIES[strategyName];
  
  if (!strategyPath) {
    const available = Object.keys(AVAILABLE_STRATEGIES).join(', ');
    throw new Error(
      `Estrategia "${strategyName}" no encontrada. Disponibles: ${available}`
    );
  }

  return require(strategyPath);
}

/**
 * Factory para crear instancias de DecisionMaker
 * 
 * @param {Object} options - Opciones
 * @param {string} options.strategy - Nombre de estrategia
 * @param {string} options.provider - Proveedor LLM
 * @param {boolean} options.autoInit - Auto-inicializar (default: true)
 * @returns {Promise<DecisionMaker>}
 */
async function createDecisionMaker(options = {}) {
  const {
    strategy = DEFAULT_STRATEGY,
    provider = 'groq',
    autoInit = true,
    ...rest
  } = options;

  console.log(`[Decision] Cargando estrategia: ${strategy}`);
  
  const { DecisionMaker } = loadStrategy(strategy);
  
  const dm = new DecisionMaker({
    provider,
    ...rest,
  });

  if (autoInit) {
    await dm.initialize();
  }

  return dm;
}

/**
 * Lista las estrategias disponibles
 * 
 * @returns {Array<Object>} Lista de estrategias con info
 */
function listStrategies() {
  return Object.entries(AVAILABLE_STRATEGIES).map(([name, path]) => {
    try {
      const { STRATEGY_INFO } = require(path);
      return {
        name,
        ...STRATEGY_INFO,
        isDefault: name === DEFAULT_STRATEGY,
      };
    } catch (error) {
      return {
        name,
        error: `Error cargando info: ${error.message}`,
      };
    }
  });
}

/**
 * Factory para crear ResponseGenerator
 * 
 * @param {Object} options - Opciones
 * @param {string} options.strategy - Nombre de estrategia
 * @param {string} options.provider - Proveedor LLM
 * @returns {Promise<ResponseGenerator>}
 */
async function createResponseGenerator(options = {}) {
  const {
    strategy = DEFAULT_STRATEGY,
    provider = 'groq',
    ...rest
  } = options;

  const { ResponseGenerator } = loadStrategy(strategy);
  
  const rg = new ResponseGenerator({
    provider,
    ...rest,
  });

  await rg.initialize();
  return rg;
}

// Exportar clase por defecto (para uso directo)
const DefaultStrategy = loadStrategy(DEFAULT_STRATEGY);

module.exports = DefaultStrategy.DecisionMaker;
module.exports.DecisionMaker = DefaultStrategy.DecisionMaker;
module.exports.ResponseGenerator = DefaultStrategy.ResponseGenerator;
module.exports.Evaluator = DefaultStrategy.Evaluator;
module.exports.Planner = DefaultStrategy.Planner;
module.exports.Scheduler = DefaultStrategy.Scheduler;
module.exports.createDecisionMaker = createDecisionMaker;
module.exports.createResponseGenerator = createResponseGenerator;
module.exports.loadStrategy = loadStrategy;
module.exports.listStrategies = listStrategies;
module.exports.AVAILABLE_STRATEGIES = AVAILABLE_STRATEGIES;
module.exports.DEFAULT_STRATEGY = DEFAULT_STRATEGY;

