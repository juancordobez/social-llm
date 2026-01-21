/**
 * PersonalityEngine v1 - Traits Schema
 * 
 * Define la estructura de datos para representar personalidad.
 * 
 * ESTRATEGIA v1: Valores numéricos 0-1
 * - Ventaja: Simple, ajustable
 * - Limitación: Pierde matices del texto original
 */

/**
 * Traits por defecto (personalidad "neutral")
 * Todos los valores en 0.5 = punto medio
 */
const DEFAULT_TRAITS = {
  // ========== TONO ==========
  // Cómo "suena" el mensaje
  tone: {
    formality: 0.5,    // 0 = "che boludo" → 1 = "Estimado señor"
    humor: 0.3,        // 0 = serio total → 1 = todo es chiste
    enthusiasm: 0.5,   // 0 = "meh" → 1 = "¡¡¡INCREÍBLE!!!"
    empathy: 0.5,      // 0 = frío/directo → 1 = muy comprensivo
  },

  // ========== ESTILO ==========
  // Cómo se estructura el mensaje
  style: {
    verbosity: 0.5,    // 0 = "Ok" → 1 = párrafos largos
    complexity: 0.5,   // 0 = palabras simples → 1 = jerga técnica
    emojiUsage: 0.3,   // 0 = ninguno → 1 = 🚀🎉😍 en todo
    hashtagUsage: 0.3, // 0 = sin hashtags → 1 = #Todo #Es #Hashtag
  },

  // ========== CONTENIDO ==========
  // Sobre qué habla
  topics: [],          // ["tecnología", "IA", "startups"]

  // ========== VOCABULARIO ==========
  // Palabras y frases características
  vocabulary: {
    preferredWords: [],  // ["genial", "interesante", "dale"]
    avoidedWords: [],    // ["odio", "terrible"]
    catchphrases: [],    // ["a darle átomos", "vamos que vamos"]
  },

  // ========== COMPORTAMIENTO ==========
  // Patrones de uso (menos usado en v1)
  behavior: {
    engagementStyle: 'balanced', // passive | balanced | active
  },

  // ========== METADATA ==========
  confidence: 0.5,     // Qué tan seguro está el análisis (0-1)
  summary: '',         // Resumen en texto del perfil
  analyzedAt: null,    // Timestamp del análisis
  version: '1.0.0',    // Versión del schema
};

/**
 * Valida que un objeto de traits tenga la estructura correcta
 * @param {Object} traits - Traits a validar
 * @returns {boolean}
 */
function validateTraits(traits) {
  if (!traits || typeof traits !== 'object') return false;
  
  // Validar que tone exista y tenga valores numéricos
  if (!traits.tone) return false;
  const toneKeys = ['formality', 'humor', 'enthusiasm', 'empathy'];
  for (const key of toneKeys) {
    if (typeof traits.tone[key] !== 'number') return false;
    if (traits.tone[key] < 0 || traits.tone[key] > 1) return false;
  }

  // Validar style
  if (!traits.style) return false;
  const styleKeys = ['verbosity', 'complexity', 'emojiUsage', 'hashtagUsage'];
  for (const key of styleKeys) {
    if (typeof traits.style[key] !== 'number') return false;
  }

  return true;
}

/**
 * Crea una copia de DEFAULT_TRAITS
 * Útil para no mutar el original
 */
function createEmptyTraits() {
  return JSON.parse(JSON.stringify(DEFAULT_TRAITS));
}

/**
 * Combina traits parciales con los defaults
 * @param {Object} partial - Traits incompletos
 * @returns {Object} Traits completos
 */
function mergeWithDefaults(partial) {
  const base = createEmptyTraits();
  
  if (partial.tone) {
    Object.assign(base.tone, partial.tone);
  }
  if (partial.style) {
    Object.assign(base.style, partial.style);
  }
  if (partial.topics) {
    base.topics = partial.topics;
  }
  if (partial.vocabulary) {
    base.vocabulary = { ...base.vocabulary, ...partial.vocabulary };
  }
  if (partial.behavior) {
    base.behavior = { ...base.behavior, ...partial.behavior };
  }
  if (partial.confidence !== undefined) {
    base.confidence = partial.confidence;
  }
  if (partial.summary) {
    base.summary = partial.summary;
  }
  
  base.analyzedAt = new Date().toISOString();
  
  return base;
}

module.exports = {
  DEFAULT_TRAITS,
  validateTraits,
  createEmptyTraits,
  mergeWithDefaults,
};
