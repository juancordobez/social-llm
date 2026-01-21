/**
 * Social Mimic - PersonalityEngine
 * @description Motor de análisis y generación de personalidad
 * 
 * Este es el corazón del sistema de "imitación humana".
 * Analiza datos del usuario para extraer traits de personalidad
 * y genera contenido auténtico basado en esos traits.
 * 
 * Issue #7 - Sprint 01
 */

const { getAI } = require('../adapters');

/**
 * Personality Traits Schema
 * Estructura que define la personalidad de un perfil
 */
const DEFAULT_TRAITS = {
  // Tono de comunicación (0-1 scale donde aplique)
  tone: {
    formality: 0.5,      // 0 = casual, 1 = formal
    humor: 0.3,          // 0 = serio, 1 = humorístico
    enthusiasm: 0.5,     // 0 = reservado, 1 = entusiasta
    empathy: 0.5,        // 0 = directo, 1 = empático
  },
  
  // Estilo de escritura
  style: {
    verbosity: 0.5,      // 0 = conciso, 1 = detallado
    complexity: 0.5,     // 0 = simple, 1 = técnico
    emoji_usage: 0.3,    // 0 = ninguno, 1 = frecuente
    hashtag_style: 0.5,  // 0 = mínimo, 1 = abundante
  },
  
  // Temas de expertise
  topics: [],
  
  // Vocabulario característico
  vocabulary: {
    preferred_words: [],
    avoided_words: [],
    catchphrases: [],
  },
  
  // Patrones de comportamiento
  behavior: {
    posting_frequency: 'daily',  // hourly, daily, weekly
    best_times: [],              // Mejores horarios
    response_speed: 'moderate',  // fast, moderate, slow
    engagement_style: 'balanced', // passive, balanced, active
  },
  
  // Objetivos del perfil
  objectives: {
    primary_goal: 'engagement',  // engagement, sales, awareness, education
    target_audience: '',
    call_to_action_style: 'subtle', // none, subtle, direct
  },
};

class PersonalityEngine {
  constructor(config = {}) {
    this.ai = config.aiAdapter || getAI();
    this.logger = config.logger || console;
  }

  // ==================== ANÁLISIS DE PERFIL ====================

  /**
   * Analiza datos de usuario y extrae traits de personalidad
   * @param {Object} userData - Datos del usuario (bio, posts, etc.)
   * @returns {Promise<Object>} Traits de personalidad extraídos
   */
  async analyzeProfile(userData) {
    this.logger.log('[PersonalityEngine] Analyzing profile...');

    const { bio, samplePosts, socialLinks, preferences } = userData;

    // Si hay posts de ejemplo, analizarlos con IA
    if (samplePosts && samplePosts.length > 0) {
      return this._analyzeFromSamples(samplePosts, bio);
    }

    // Si solo hay bio/preferencias, crear traits básicos
    return this._createBasicTraits(bio, preferences);
  }

  /**
   * Analiza muestras de texto para extraer personalidad
   * @private
   */
  async _analyzeFromSamples(samples, bio = '') {
    const prompt = `Analyze the following text samples from a social media user and extract their personality traits.

${bio ? `USER BIO: ${bio}\n` : ''}
SAMPLE POSTS:
${samples.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}

Respond with a JSON object following this exact structure:
{
  "tone": {
    "formality": 0.0-1.0,
    "humor": 0.0-1.0,
    "enthusiasm": 0.0-1.0,
    "empathy": 0.0-1.0
  },
  "style": {
    "verbosity": 0.0-1.0,
    "complexity": 0.0-1.0,
    "emoji_usage": 0.0-1.0,
    "hashtag_style": 0.0-1.0
  },
  "topics": ["main", "topics", "of", "expertise"],
  "vocabulary": {
    "preferred_words": ["words", "they", "use", "often"],
    "catchphrases": ["signature", "phrases"]
  },
  "behavior": {
    "engagement_style": "passive|balanced|active"
  },
  "confidence": 0.0-1.0,
  "summary": "One paragraph description of this person's online personality"
}`;

    try {
      const result = await this.ai.generateText(prompt, {
        systemPrompt: 'You are an expert psycholinguistic analyst. Respond only with valid JSON.',
        temperature: 0.3,
        maxTokens: 800,
      });

      // Parse JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analyzed = JSON.parse(jsonMatch[0]);
        return this._mergeWithDefaults(analyzed);
      }

      throw new Error('No valid JSON in response');
    } catch (error) {
      this.logger.error('[PersonalityEngine] Analysis failed:', error.message);
      return this._createBasicTraits('', {});
    }
  }

  /**
   * Crea traits básicos cuando no hay muestras
   * @private
   */
  _createBasicTraits(bio, preferences = {}) {
    const traits = JSON.parse(JSON.stringify(DEFAULT_TRAITS));

    // Aplicar preferencias del usuario si existen
    if (preferences.tone) {
      Object.assign(traits.tone, preferences.tone);
    }
    if (preferences.style) {
      Object.assign(traits.style, preferences.style);
    }
    if (preferences.topics) {
      traits.topics = preferences.topics;
    }
    if (preferences.objectives) {
      Object.assign(traits.objectives, preferences.objectives);
    }

    traits.confidence = 0.5; // Baja confianza sin muestras
    traits.summary = 'Basic profile created from preferences. Provide sample posts for better analysis.';

    return traits;
  }

  /**
   * Combina traits analizados con defaults
   * @private
   */
  _mergeWithDefaults(analyzed) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_TRAITS));

    // Merge tone
    if (analyzed.tone) {
      Object.assign(merged.tone, analyzed.tone);
    }

    // Merge style
    if (analyzed.style) {
      Object.assign(merged.style, analyzed.style);
    }

    // Topics
    if (analyzed.topics) {
      merged.topics = analyzed.topics;
    }

    // Vocabulary
    if (analyzed.vocabulary) {
      merged.vocabulary = { ...merged.vocabulary, ...analyzed.vocabulary };
    }

    // Behavior
    if (analyzed.behavior) {
      merged.behavior = { ...merged.behavior, ...analyzed.behavior };
    }

    // Metadata
    merged.confidence = analyzed.confidence || 0.7;
    merged.summary = analyzed.summary || '';
    merged.analyzedAt = new Date().toISOString();

    return merged;
  }

  // ==================== GENERACIÓN DE PROMPTS ====================

  /**
   * Genera un system prompt basado en los traits de personalidad
   * @param {Object} traits - Traits de personalidad
   * @param {string} platform - Plataforma objetivo (twitter, linkedin, etc.)
   * @returns {string} System prompt para el modelo de IA
   */
  generateSystemPrompt(traits, platform = 'general') {
    const toneDescription = this._describeTone(traits.tone);
    const styleDescription = this._describeStyle(traits.style);
    const platformGuidelines = this._getPlatformGuidelines(platform);

    return `You are a social media content creator with the following personality:

PERSONALITY PROFILE:
${toneDescription}
${styleDescription}

EXPERTISE AREAS: ${traits.topics?.join(', ') || 'General topics'}

${traits.vocabulary?.catchphrases?.length > 0 
  ? `SIGNATURE PHRASES: "${traits.vocabulary.catchphrases.join('", "')}"` 
  : ''}

${traits.vocabulary?.preferred_words?.length > 0 
  ? `VOCABULARY STYLE: Tends to use words like: ${traits.vocabulary.preferred_words.join(', ')}` 
  : ''}

ENGAGEMENT STYLE: ${traits.behavior?.engagement_style || 'balanced'}

${platformGuidelines}

IMPORTANT RULES:
- Write as if you ARE this person, not describing them
- Be authentic and consistent with the personality
- ${traits.objectives?.call_to_action_style === 'subtle' ? 'Use subtle calls to action' : 
   traits.objectives?.call_to_action_style === 'direct' ? 'Be direct with calls to action' : 
   'Avoid explicit calls to action'}
- Match the energy and tone naturally`;
  }

  /**
   * Describe el tono basado en scores
   * @private
   */
  _describeTone(tone) {
    const descriptions = [];

    // Formality
    if (tone.formality < 0.3) descriptions.push('casual and relaxed');
    else if (tone.formality > 0.7) descriptions.push('professional and formal');
    else descriptions.push('conversational yet polished');

    // Humor
    if (tone.humor > 0.6) descriptions.push('enjoys humor and wit');
    else if (tone.humor < 0.3) descriptions.push('serious and focused');

    // Enthusiasm
    if (tone.enthusiasm > 0.7) descriptions.push('highly enthusiastic and energetic');
    else if (tone.enthusiasm < 0.3) descriptions.push('calm and measured');

    // Empathy
    if (tone.empathy > 0.7) descriptions.push('empathetic and understanding');
    else if (tone.empathy < 0.3) descriptions.push('direct and to the point');

    return `TONE: ${descriptions.join(', ')}`;
  }

  /**
   * Describe el estilo basado en scores
   * @private
   */
  _describeStyle(style) {
    const descriptions = [];

    // Verbosity
    if (style.verbosity < 0.3) descriptions.push('concise and punchy');
    else if (style.verbosity > 0.7) descriptions.push('detailed and thorough');

    // Complexity
    if (style.complexity > 0.7) descriptions.push('uses technical language');
    else if (style.complexity < 0.3) descriptions.push('simple and accessible');

    // Emoji
    if (style.emoji_usage > 0.6) descriptions.push('frequently uses emojis');
    else if (style.emoji_usage < 0.2) descriptions.push('minimal emoji use');

    // Hashtags
    if (style.hashtag_style > 0.7) descriptions.push('strategic hashtag user');
    else if (style.hashtag_style < 0.3) descriptions.push('minimal hashtags');

    return `WRITING STYLE: ${descriptions.join(', ')}`;
  }

  /**
   * Obtiene guías específicas de plataforma
   * @private
   */
  _getPlatformGuidelines(platform) {
    const guidelines = {
      twitter: `PLATFORM (Twitter/X):
- Maximum 280 characters
- Be punchy and engaging
- Threads allowed for longer content
- Use relevant hashtags (2-3 max)`,

      linkedin: `PLATFORM (LinkedIn):
- Professional but personable
- Can be longer form (up to 3000 chars)
- Use line breaks for readability
- Minimal hashtags (3-5 relevant ones)`,

      instagram: `PLATFORM (Instagram):
- Focus on visual storytelling
- Captions can be longer but hook in first line
- Hashtags at the end (up to 30, but 5-10 is optimal)
- Use emojis naturally`,

      facebook: `PLATFORM (Facebook):
- Conversational and community-focused
- Questions drive engagement
- Mix of content lengths
- Links are okay`,

      general: `PLATFORM: Adapt to context
- Be authentic to the personality
- Focus on value and engagement`,
    };

    return guidelines[platform] || guidelines.general;
  }

  // ==================== GENERACIÓN DE CONTENIDO ====================

  /**
   * Genera contenido basado en personalidad
   * @param {Object} traits - Traits de personalidad
   * @param {Object} request - Solicitud de contenido
   * @returns {Promise<Object>} Contenido generado
   */
  async generateContent(traits, request) {
    const { topic, platform, contentType = 'post', context = '' } = request;

    const systemPrompt = this.generateSystemPrompt(traits, platform);

    const userPrompt = this._buildContentPrompt(topic, contentType, context, traits);

    const result = await this.ai.generateText(userPrompt, {
      systemPrompt,
      temperature: 0.8, // Más creatividad para contenido
      maxTokens: 500,
    });

    return {
      content: result.text.trim(),
      platform,
      contentType,
      topic,
      generatedAt: new Date().toISOString(),
      model: result.model,
      usage: result.usage,
      traits_used: {
        tone: traits.tone,
        style: traits.style,
      },
    };
  }

  /**
   * Construye el prompt para generación de contenido
   * @private
   */
  _buildContentPrompt(topic, contentType, context, traits) {
    const prompts = {
      post: `Create a ${traits.objectives?.primary_goal === 'engagement' ? 'engaging' : 'compelling'} social media post about: ${topic}

${context ? `CONTEXT: ${context}\n` : ''}
Write the post directly, no explanations needed.`,

      comment: `Write a thoughtful comment responding to this:
"${context}"

Topic relevance: ${topic}
Be authentic and add value to the conversation.`,

      reply: `Write a friendly reply to this message:
"${context}"

Keep it natural and on-brand.`,

      dm: `Write a direct message about: ${topic}

${context ? `CONTEXT: ${context}\n` : ''}
Be personal but professional. Build rapport.`,

      thread: `Create a thread (3-5 tweets) about: ${topic}

${context ? `CONTEXT: ${context}\n` : ''}
Format as:
1/ First tweet (hook)
2/ Development
3/ Development
4/ Conclusion/CTA

Make it valuable and shareable.`,
    };

    return prompts[contentType] || prompts.post;
  }

  // ==================== SCORING Y EVALUACIÓN ====================

  /**
   * Calcula un score de compatibilidad entre contenido y personalidad
   * @param {string} content - Contenido a evaluar
   * @param {Object} traits - Traits de personalidad
   * @returns {Promise<Object>} Score y feedback
   */
  async scoreContentMatch(content, traits) {
    const prompt = `Evaluate how well this content matches the personality profile.

CONTENT:
"${content}"

EXPECTED PERSONALITY:
- Tone: formality=${traits.tone.formality}, humor=${traits.tone.humor}, enthusiasm=${traits.tone.enthusiasm}
- Style: verbosity=${traits.style.verbosity}, complexity=${traits.style.complexity}
- Topics: ${traits.topics?.join(', ')}

Respond in JSON:
{
  "overall_score": 0.0-1.0,
  "tone_match": 0.0-1.0,
  "style_match": 0.0-1.0,
  "authenticity": 0.0-1.0,
  "feedback": "Brief improvement suggestions"
}`;

    try {
      const result = await this.ai.generateText(prompt, {
        systemPrompt: 'You are a content authenticity evaluator. Respond only with valid JSON.',
        temperature: 0.2,
        maxTokens: 300,
      });

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { overall_score: 0.5, feedback: 'Could not evaluate' };
    } catch (error) {
      this.logger.error('[PersonalityEngine] Scoring failed:', error.message);
      return { overall_score: 0.5, feedback: 'Evaluation error' };
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Exporta traits en formato simplificado para UI
   * @param {Object} traits - Traits completos
   * @returns {Object} Traits simplificados
   */
  simplifyTraits(traits) {
    return {
      tone: this._scoreToLabel(traits.tone.formality, ['Casual', 'Balanced', 'Formal']),
      humor: this._scoreToLabel(traits.tone.humor, ['Serious', 'Moderate', 'Humorous']),
      energy: this._scoreToLabel(traits.tone.enthusiasm, ['Calm', 'Balanced', 'Energetic']),
      style: this._scoreToLabel(traits.style.verbosity, ['Concise', 'Balanced', 'Detailed']),
      complexity: this._scoreToLabel(traits.style.complexity, ['Simple', 'Accessible', 'Technical']),
      topics: traits.topics?.slice(0, 5) || [],
      confidence: Math.round((traits.confidence || 0.5) * 100) + '%',
    };
  }

  /**
   * Convierte score numérico a label
   * @private
   */
  _scoreToLabel(score, labels) {
    if (score < 0.33) return labels[0];
    if (score < 0.66) return labels[1];
    return labels[2];
  }
}

// Export
module.exports = { PersonalityEngine, DEFAULT_TRAITS };
