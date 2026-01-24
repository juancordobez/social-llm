/**
 * MemorySystem - Punto de entrada
 * 
 * Carga dinámicamente la estrategia de memoria configurada.
 * Por defecto: supabase-rag-v1
 * 
 * @usage
 * const { MemorySystem, createMemorySystem } = require('../brain/memory');
 * 
 * // Opción 1: Con factory
 * const memory = await createMemorySystem(supabaseClient, {
 *   strategy: 'supabase-rag-v1',
 *   embedderType: 'local'
 * });
 * 
 * // Opción 2: Directo
 * const MemorySystem = require('../brain/memory');
 * const memory = new MemorySystem(supabaseClient);
 * await memory.initialize();
 */

// Estrategias disponibles
const AVAILABLE_STRATEGIES = {
  'supabase-rag-v1': './strategies/supabase-rag-v1',
};

// Estrategia por defecto
const DEFAULT_STRATEGY = 'supabase-rag-v1';

/**
 * Carga una estrategia de memoria
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
 * Factory para crear instancias de MemorySystem
 * 
 * @param {Object} supabaseClient - Cliente Supabase
 * @param {Object} options - Opciones
 * @param {string} options.strategy - Nombre de estrategia
 * @param {string} options.embedderType - 'local' o 'mock'
 * @param {boolean} options.autoInit - Auto-inicializar (default: true)
 * @returns {Promise<MemorySystem>}
 */
async function createMemorySystem(supabaseClient, options = {}) {
  const {
    strategy = DEFAULT_STRATEGY,
    embedderType = 'local',
    autoInit = true,
    ...rest
  } = options;

  console.log(`[Memory] Cargando estrategia: ${strategy}`);
  
  const { MemorySystem } = loadStrategy(strategy);
  
  const memory = new MemorySystem(supabaseClient, {
    embedderType,
    ...rest,
  });

  if (autoInit) {
    await memory.initialize();
  }

  return memory;
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

// Exportar clase por defecto (para uso directo)
const DefaultStrategy = loadStrategy(DEFAULT_STRATEGY);

module.exports = DefaultStrategy.MemorySystem;
module.exports.MemorySystem = DefaultStrategy.MemorySystem;
module.exports.MemoryStore = DefaultStrategy.MemoryStore;
module.exports.MemoryRetriever = DefaultStrategy.MemoryRetriever;
module.exports.createEmbedder = DefaultStrategy.createEmbedder;
module.exports.createMemorySystem = createMemorySystem;
module.exports.loadStrategy = loadStrategy;
module.exports.listStrategies = listStrategies;
module.exports.AVAILABLE_STRATEGIES = AVAILABLE_STRATEGIES;
module.exports.DEFAULT_STRATEGY = DEFAULT_STRATEGY;
