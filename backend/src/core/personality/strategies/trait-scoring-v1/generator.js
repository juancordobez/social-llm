/**
 * PersonalityEngine v1 - Generator
 * 
 * Genera contenido que imita una personalidad.
 * Usa los traits + prompts + LLM para crear posts auténticos.
 */

const { 
  buildPersonalitySystemPrompt, 
  CONTENT_PROMPTS 
} = require('./prompts');

/**
 * Genera contenido imitando una personalidad
 * 
 * @param {Object} llmClient - Cliente LLM
 * @param {Object} traits - Traits de personalidad
 * @param {Object} request - Solicitud de contenido
 * @param {string} request.type - 'post', 'reply', 'comment', 'thread'
 * @param {string} request.topic - Tema del contenido
 * @param {string} request.context - Contexto adicional
 * @param {string} request.platform - twitter, linkedin, etc
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<string>} Contenido generado
 */
async function generateContent(llmClient, traits, request, options = {}) {
  const { 
    type = 'post', 
    topic = '', 
    context = '', 
    platform = 'twitter' 
  } = request;
  
  const { 
    model = 'llama-3.1-70b-versatile',
    temperature = 0.8,
    maxAttempts = 3,
  } = options;

  // Construir system prompt con personalidad
  const systemPrompt = buildPersonalitySystemPrompt(traits, platform);

  // Construir user prompt según tipo
  const userPrompt = buildUserPrompt(type, topic, context);

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await llmClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature + (attempt - 1) * 0.1, // Aumentar si falla
        max_tokens: getMaxTokens(type, platform),
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('LLM no retornó contenido');
      }

      // Limpiar y validar
      const cleaned = cleanContent(content, platform);
      
      if (validateContent(cleaned, type, platform)) {
        return cleaned;
      }

      // Si no pasa validación, reintentar
      lastError = new Error(`Contenido no válido: "${cleaned.substring(0, 50)}..."`);

    } catch (error) {
      lastError = error;
      console.warn(`[Generator] Intento ${attempt}/${maxAttempts} falló:`, error.message);
    }
  }

  throw new Error(`Generación fallida después de ${maxAttempts} intentos: ${lastError?.message}`);
}

/**
 * Genera múltiples variaciones de contenido
 * 
 * @param {Object} llmClient - Cliente LLM
 * @param {Object} traits - Traits de personalidad
 * @param {Object} request - Solicitud de contenido
 * @param {number} count - Cantidad de variaciones
 * @returns {Promise<Array<string>>} Array de contenidos
 */
async function generateVariations(llmClient, traits, request, count = 3) {
  const variations = [];
  const baseTemp = 0.7;

  for (let i = 0; i < count; i++) {
    try {
      const content = await generateContent(
        llmClient, 
        traits, 
        request, 
        { temperature: baseTemp + i * 0.15 }
      );
      variations.push(content);
    } catch (error) {
      console.warn(`[Generator] Variación ${i + 1} falló:`, error.message);
    }
  }

  // Deduplicar variaciones muy similares
  return deduplicateVariations(variations);
}

/**
 * Construye el prompt de usuario según tipo
 */
function buildUserPrompt(type, topic, context) {
  const promptBuilder = CONTENT_PROMPTS[type];
  
  if (!promptBuilder) {
    // Fallback a post genérico
    return CONTENT_PROMPTS.post(topic, context);
  }

  if (type === 'reply' || type === 'comment') {
    return promptBuilder(context);
  }

  return promptBuilder(topic, context);
}

/**
 * Limpia el contenido generado
 */
function cleanContent(content, platform) {
  let cleaned = content.trim();

  // Remover comillas envolventes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remover prefijos comunes del LLM
  const prefixes = [
    'Here\'s a tweet:',
    'Here is a post:',
    'Tweet:',
    'Post:',
    'Sure, here',
    'I\'d write:',
  ];
  
  for (const prefix of prefixes) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  // Truncar según plataforma
  if (platform === 'twitter' && cleaned.length > 280) {
    cleaned = cleaned.substring(0, 277) + '...';
  }

  return cleaned;
}

/**
 * Valida que el contenido sea aceptable
 */
function validateContent(content, type, platform) {
  // Muy corto
  if (content.length < 5) return false;

  // Muy largo para Twitter
  if (platform === 'twitter' && type !== 'thread' && content.length > 280) {
    return false;
  }

  // Parece meta-comentario
  const metaPatterns = [
    /^here's/i,
    /^this is/i,
    /would be/i,
    /you could say/i,
  ];
  
  for (const pattern of metaPatterns) {
    if (pattern.test(content)) return false;
  }

  return true;
}

/**
 * Elimina variaciones demasiado similares
 */
function deduplicateVariations(variations) {
  const unique = [];
  
  for (const v of variations) {
    const isDuplicate = unique.some(existing => 
      similarity(existing, v) > 0.8
    );
    
    if (!isDuplicate) {
      unique.push(v);
    }
  }

  return unique;
}

/**
 * Calcula similitud simple entre dos strings
 * (Jaccard similarity sobre palabras)
 */
function similarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  
  return intersection / union;
}

/**
 * Retorna max tokens según tipo y plataforma
 */
function getMaxTokens(type, platform) {
  if (type === 'thread') return 500;
  if (platform === 'linkedin') return 400;
  if (platform === 'twitter') return 100;
  return 200;
}

module.exports = {
  generateContent,
  generateVariations,
  cleanContent,
  validateContent,
};
