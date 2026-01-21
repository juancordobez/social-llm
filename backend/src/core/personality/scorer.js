/**
 * PersonalityEngine v1 - Scorer
 * 
 * Evalúa qué tan auténtico es un contenido respecto a una personalidad.
 * Útil para:
 * - Validar contenido antes de publicar
 * - Seleccionar la mejor variación
 * - Feedback para mejorar generación
 */

const { buildScoringPrompt, SCORING_SYSTEM_PROMPT } = require('./prompts');

/**
 * Evalúa qué tan bien un contenido coincide con traits
 * 
 * @param {Object} llmClient - Cliente LLM
 * @param {string} content - Contenido a evaluar
 * @param {Object} traits - Traits de referencia
 * @param {Object} options - Opciones
 * @returns {Promise<Object>} Score con detalles
 */
async function scoreContent(llmClient, content, traits, options = {}) {
  const { model = 'llama-3.1-70b-versatile' } = options;

  try {
    const prompt = buildScoringPrompt(content, traits);

    const response = await llmClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SCORING_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2, // Bajo para evaluación consistente
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error('LLM no retornó resultado');
    }

    const parsed = JSON.parse(result);
    
    return normalizeScore(parsed);

  } catch (error) {
    console.error('[Scorer] Error evaluando contenido:', error.message);
    
    // Fallback a scoring básico
    return scoreBasic(content, traits);
  }
}

/**
 * Scoring básico sin LLM (fallback)
 * Usa heurísticas simples.
 * 
 * @param {string} content - Contenido
 * @param {Object} traits - Traits
 * @returns {Object} Score básico
 */
function scoreBasic(content, traits) {
  let score = 0.5; // Base
  const feedback = [];

  // Verificar longitud vs verbosity
  const expectedLength = traits.style.verbosity * 280;
  const lengthDiff = Math.abs(content.length - expectedLength) / 280;
  score -= lengthDiff * 0.1;

  // Verificar emojis
  const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const expectedEmojis = traits.style.emojiUsage > 0.5;
  const hasEmojis = emojiCount > 0;
  
  if (expectedEmojis !== hasEmojis) {
    score -= 0.1;
    feedback.push(expectedEmojis ? 'Agregar emojis' : 'Quitar emojis');
  }

  // Verificar hashtags
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  const expectedHashtags = traits.style.hashtagUsage > 0.5;
  const hasHashtags = hashtagCount > 0;
  
  if (expectedHashtags !== hasHashtags) {
    score -= 0.1;
    feedback.push(expectedHashtags ? 'Agregar hashtags' : 'Reducir hashtags');
  }

  // Verificar exclamaciones (entusiasmo)
  const exclamations = (content.match(/!/g) || []).length;
  const expectedEnthusiasm = traits.tone.enthusiasm > 0.6;
  const hasExclamations = exclamations > 0;
  
  if (expectedEnthusiasm && !hasExclamations) {
    score -= 0.05;
    feedback.push('Más entusiasmo');
  }

  // Verificar palabras preferidas
  const preferredWords = traits.vocabulary?.preferredWords || [];
  const usedPreferred = preferredWords.filter(w => 
    content.toLowerCase().includes(w.toLowerCase())
  ).length;
  
  if (preferredWords.length > 0 && usedPreferred === 0) {
    score -= 0.05;
    feedback.push('Usar vocabulario característico');
  }

  return {
    overall: Math.max(0, Math.min(1, score)),
    toneMatch: 0.5, // No podemos evaluar sin LLM
    styleMatch: score,
    feedback: feedback.length > 0 
      ? feedback.join('. ') 
      : 'Evaluación básica sin LLM',
  };
}

/**
 * Normaliza score del LLM
 */
function normalizeScore(raw) {
  return {
    overall: clamp(raw.overall || 0.5),
    toneMatch: clamp(raw.toneMatch || raw.tone_match || 0.5),
    styleMatch: clamp(raw.styleMatch || raw.style_match || 0.5),
    feedback: raw.feedback || '',
  };
}

/**
 * Selecciona el mejor contenido de varias opciones
 * 
 * @param {Object} llmClient - Cliente LLM
 * @param {Array<string>} variations - Opciones de contenido
 * @param {Object} traits - Traits de referencia
 * @returns {Promise<Object>} { content, score }
 */
async function selectBest(llmClient, variations, traits) {
  if (!variations || variations.length === 0) {
    throw new Error('No hay variaciones para evaluar');
  }

  if (variations.length === 1) {
    const score = await scoreContent(llmClient, variations[0], traits);
    return { content: variations[0], score };
  }

  // Evaluar todas en paralelo
  const scored = await Promise.all(
    variations.map(async (content) => {
      const score = await scoreContent(llmClient, content, traits);
      return { content, score };
    })
  );

  // Ordenar por score overall
  scored.sort((a, b) => b.score.overall - a.score.overall);

  return scored[0];
}

/**
 * Verifica si contenido pasa umbral mínimo
 * 
 * @param {Object} score - Resultado de scoreContent
 * @param {number} threshold - Umbral mínimo (default 0.6)
 * @returns {boolean}
 */
function passesThreshold(score, threshold = 0.6) {
  return score.overall >= threshold;
}

// --- Utilidades ---

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  scoreContent,
  scoreBasic,
  selectBest,
  passesThreshold,
};
