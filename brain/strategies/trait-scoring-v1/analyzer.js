/**
 * PersonalityEngine v1 - Analyzer
 * 
 * Analiza posts/contenido para extraer traits de personalidad.
 * Estrategia v1: Reducción a métricas numéricas 0-1.
 */

const { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } = require('./prompts');
const { DEFAULT_TRAITS, validateTraits, mergeWithDefaults } = require('./traits');

/**
 * Analiza muestras de contenido para extraer personalidad
 * 
 * @param {Object} llmClient - Cliente LLM (Groq, OpenAI, etc)
 * @param {Array<string>} samples - Posts de ejemplo
 * @param {Object} options - Opciones adicionales
 * @param {string} options.bio - Bio del usuario
 * @param {string} options.model - Modelo a usar
 * @returns {Promise<Object>} Traits extraídos
 */
async function analyzeFromSamples(llmClient, samples, options = {}) {
  const { bio = '', model = 'llama-3.1-70b-versatile' } = options;

  // Validar que hay suficientes samples
  if (!samples || samples.length < 3) {
    console.warn('[Analyzer] Pocos samples, resultados pueden ser inexactos');
  }

  // Filtrar samples vacíos y limpiar
  const cleanSamples = samples
    .filter(s => s && s.trim().length > 0)
    .map(s => s.trim())
    .slice(0, 50); // Max 50 para no exceder contexto

  if (cleanSamples.length === 0) {
    console.warn('[Analyzer] No hay samples válidos, retornando defaults');
    return { ...DEFAULT_TRAITS };
  }

  try {
    const prompt = buildAnalysisPrompt(cleanSamples, bio);
    
    const response = await llmClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Bajo para análisis consistente
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM no retornó contenido');
    }

    const parsed = JSON.parse(content);
    
    // Validar y completar con defaults
    const traits = mergeWithDefaults(parsed);
    
    // Validar estructura
    if (!validateTraits(traits)) {
      console.warn('[Analyzer] Traits inválidos, usando defaults');
      return { ...DEFAULT_TRAITS };
    }

    return traits;

  } catch (error) {
    console.error('[Analyzer] Error analizando samples:', error.message);
    
    // Intentar análisis básico como fallback
    return createBasicTraits(cleanSamples);
  }
}

/**
 * Crea traits básicos sin LLM (fallback)
 * Análisis heurístico simple.
 * 
 * @param {Array<string>} samples - Posts
 * @returns {Object} Traits básicos
 */
function createBasicTraits(samples) {
  const allText = samples.join(' ');
  const avgLength = samples.reduce((sum, s) => sum + s.length, 0) / samples.length;

  // Contar emojis (regex simple)
  const emojiCount = (allText.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const emojiRatio = emojiCount / samples.length;

  // Contar hashtags
  const hashtagCount = (allText.match(/#\w+/g) || []).length;
  const hashtagRatio = hashtagCount / samples.length;

  // Contar signos de exclamación (entusiasmo)
  const exclamationCount = (allText.match(/!/g) || []).length;
  const exclamationRatio = exclamationCount / samples.length;

  // Contar preguntas (engagement)
  const questionCount = (allText.match(/\?/g) || []).length;

  // Extraer palabras frecuentes
  const words = allText.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const wordFreq = {};
  words.forEach(w => {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });
  const frequentWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return {
    tone: {
      formality: avgLength > 150 ? 0.6 : 0.4,
      humor: 0.5, // No podemos detectar sin LLM
      enthusiasm: Math.min(1, exclamationRatio * 0.3),
      empathy: questionCount > samples.length * 0.2 ? 0.6 : 0.4,
    },
    style: {
      verbosity: Math.min(1, avgLength / 280),
      complexity: avgLength > 200 ? 0.6 : 0.4,
      emojiUsage: Math.min(1, emojiRatio * 0.5),
      hashtagUsage: Math.min(1, hashtagRatio * 0.3),
    },
    topics: [],
    vocabulary: {
      preferredWords: frequentWords,
      catchphrases: [],
    },
    confidence: 0.3, // Baja confianza sin LLM
    summary: 'Análisis básico sin LLM. Confianza limitada.',
  };
}

/**
 * Combina traits de múltiples análisis
 * Útil para análisis progresivo.
 * 
 * @param {Array<Object>} traitsArray - Array de traits
 * @returns {Object} Traits combinados
 */
function combineTraits(traitsArray) {
  if (!traitsArray || traitsArray.length === 0) {
    return { ...DEFAULT_TRAITS };
  }

  if (traitsArray.length === 1) {
    return traitsArray[0];
  }

  // Promediar valores numéricos
  const combined = {
    tone: {
      formality: avg(traitsArray.map(t => t.tone?.formality || 0.5)),
      humor: avg(traitsArray.map(t => t.tone?.humor || 0.5)),
      enthusiasm: avg(traitsArray.map(t => t.tone?.enthusiasm || 0.5)),
      empathy: avg(traitsArray.map(t => t.tone?.empathy || 0.5)),
    },
    style: {
      verbosity: avg(traitsArray.map(t => t.style?.verbosity || 0.5)),
      complexity: avg(traitsArray.map(t => t.style?.complexity || 0.5)),
      emojiUsage: avg(traitsArray.map(t => t.style?.emojiUsage || 0.3)),
      hashtagUsage: avg(traitsArray.map(t => t.style?.hashtagUsage || 0.3)),
    },
    topics: mergeArrays(traitsArray.map(t => t.topics || [])),
    vocabulary: {
      preferredWords: mergeArrays(traitsArray.map(t => t.vocabulary?.preferredWords || [])),
      catchphrases: mergeArrays(traitsArray.map(t => t.vocabulary?.catchphrases || [])),
    },
    confidence: avg(traitsArray.map(t => t.confidence || 0.5)),
    summary: traitsArray[traitsArray.length - 1]?.summary || '',
  };

  return combined;
}

// --- Utilidades ---

function avg(numbers) {
  if (!numbers || numbers.length === 0) return 0.5;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function mergeArrays(arrays) {
  const flat = arrays.flat();
  // Deduplicar manteniendo orden
  return [...new Set(flat)].slice(0, 20);
}

module.exports = {
  analyzeFromSamples,
  createBasicTraits,
  combineTraits,
};
