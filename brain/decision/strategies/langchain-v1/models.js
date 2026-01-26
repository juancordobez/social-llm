/**
 * LLM Model Factory - Crea instancias de modelos LangChain
 * 
 * Permite cambiar entre diferentes proveedores de LLM:
 * - Groq (actual, gratis)
 * - OpenAI (futuro)
 * - Anthropic (futuro)
 * - Local (Ollama, futuro)
 * 
 * @usage
 * const { createModel } = require('./models');
 * const model = createModel('groq'); // o 'openai', 'anthropic'
 */

const { ChatGroq } = require('@langchain/groq');

/**
 * Configuración por defecto para cada proveedor
 */
const MODEL_CONFIGS = {
  groq: {
    // Llama 3.3 70B - modelo de producción actual (junio 2025)
    // El anterior llama-3.1-70b-versatile fue descontinuado
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 1024,
  },
  'groq-fast': {
    model: 'llama-3.1-8b-instant',
    temperature: 0.5,
    maxTokens: 512,
  },
  // Futuros proveedores
  // openai: { model: 'gpt-4o-mini', temperature: 0.7 },
  // anthropic: { model: 'claude-3-haiku', temperature: 0.7 },
};

/**
 * Crea una instancia del modelo LLM
 * 
 * @param {string} provider - Proveedor: 'groq', 'groq-fast', 'openai', 'anthropic'
 * @param {Object} overrides - Configuración adicional
 * @returns {BaseChatModel} Instancia del modelo
 */
function createModel(provider = 'groq', overrides = {}) {
  const config = { ...MODEL_CONFIGS[provider], ...overrides };
  
  switch (provider) {
    case 'groq':
    case 'groq-fast':
      return createGroqModel(config);
    
    // case 'openai':
    //   return createOpenAIModel(config);
    
    // case 'anthropic':
    //   return createAnthropicModel(config);
    
    default:
      console.warn(`[Models] Proveedor "${provider}" no soportado, usando groq`);
      return createGroqModel(MODEL_CONFIGS.groq);
  }
}

/**
 * Crea modelo de Groq
 * @private
 */
function createGroqModel(config) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY no configurada. Obtén tu key en: https://console.groq.com/keys'
    );
  }

  return new ChatGroq({
    apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}

/**
 * Lista los proveedores disponibles
 */
function listProviders() {
  return Object.keys(MODEL_CONFIGS).map(key => ({
    id: key,
    ...MODEL_CONFIGS[key],
    available: checkProviderAvailable(key),
  }));
}

/**
 * Verifica si un proveedor tiene las credenciales configuradas
 */
function checkProviderAvailable(provider) {
  switch (provider) {
    case 'groq':
    case 'groq-fast':
      return !!process.env.GROQ_API_KEY;
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    default:
      return false;
  }
}

module.exports = {
  createModel,
  listProviders,
  checkProviderAvailable,
  MODEL_CONFIGS,
};
