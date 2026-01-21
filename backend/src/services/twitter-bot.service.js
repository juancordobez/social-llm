/**
 * Social Mimic - Twitter Bot Service
 * @description Servicio principal que orquesta el bot de Twitter
 * 
 * Flujo:
 * 1. Escanea menciones nuevas (via Nitter scraping)
 * 2. Analiza contexto del usuario/conversación
 * 3. Genera respuesta personalizada (PersonalityEngine + Groq)
 * 4. Publica respuesta (via Twitter API)
 * 5. Guarda en memoria para contexto futuro
 */

const { getTwitter, getAI, getDatabase, getCache } = require('../adapters');
const { PersonalityEngine } = require('../core/personality-engine');

class TwitterBotService {
  constructor(config = {}) {
    this.name = 'twitter-bot';
    
    // Inicializar dependencias
    this.twitter = getTwitter();
    this.ai = getAI();
    this.db = getDatabase();
    this.cache = getCache();
    this.personality = new PersonalityEngine({ aiAdapter: this.ai });
    
    // Configuración del bot
    this.config = {
      // Intervalo entre escaneos de menciones (ms)
      pollInterval: config.pollInterval || 60000, // 1 minuto
      
      // Máximo de menciones a procesar por ciclo
      maxMentionsPerCycle: config.maxMentionsPerCycle || 5,
      
      // Delay entre respuestas para parecer humano (ms)
      responseDelay: config.responseDelay || 5000,
      
      // Probabilidad de responder (0-1) para no parecer bot
      responseRate: config.responseRate || 0.9,
      
      // Perfil del bot (se carga de la DB)
      botProfile: null,
      
      // Modo silencioso (no publica, solo loguea)
      dryRun: config.dryRun || false,
    };
    
    // Estado del servicio
    this.running = false;
    this.pollTimer = null;
    this.stats = {
      cyclesRun: 0,
      mentionsProcessed: 0,
      repliesSent: 0,
      errors: 0,
      startTime: null,
    };
  }

  /**
   * Inicializar el bot con el perfil configurado
   */
  async initialize(botProfileId) {
    console.log('[TwitterBot] Initializing...');
    
    // Cargar perfil del bot desde la base de datos
    if (botProfileId) {
      try {
        const profile = await this.db.getById('profiles', botProfileId);
        if (profile) {
          this.config.botProfile = profile;
          console.log(`[TwitterBot] Loaded profile: ${profile.name || profile.id}`);
        }
      } catch (error) {
        console.warn('[TwitterBot] Could not load profile from DB:', error.message);
      }
    }
    
    // Si no hay perfil, crear uno por defecto
    if (!this.config.botProfile) {
      this.config.botProfile = this._getDefaultProfile();
      console.log('[TwitterBot] Using default profile');
    }
    
    // Verificar conexiones
    const health = await this.healthCheck();
    if (!health.twitter.capabilities.canRead) {
      console.warn('[TwitterBot] ⚠️ Cannot read Twitter (scraping might be blocked)');
    }
    if (!health.twitter.capabilities.canWrite) {
      console.warn('[TwitterBot] ⚠️ Cannot write to Twitter (check API credentials)');
    }
    
    return health;
  }

  /**
   * Perfil por defecto del bot
   * @private
   */
  _getDefaultProfile() {
    return {
      id: 'default-bot',
      name: 'Social Mimic Bot',
      platform: 'twitter',
      traits: {
        tone: {
          formality: 0.4,    // Casual pero respetuoso
          humor: 0.6,        // Algo de humor
          enthusiasm: 0.7,   // Entusiasta
          empathy: 0.8,      // Empático
        },
        style: {
          verbosity: 0.4,    // Respuestas concisas
          complexity: 0.5,   // Lenguaje accesible
          emojiUsage: 0.3,   // Pocos emojis
          hashtagUsage: 0.2, // Mínimo hashtags
        },
        topics: ['tecnología', 'programación', 'IA', 'startups'],
        vocabulary: ['interesante', 'genial', 'vale', 'mira', 'oye'],
      },
      metadata: {
        language: 'es',
        responseStyle: 'conversational',
      },
    };
  }

  /**
   * Procesar una mención y generar respuesta
   * @private
   */
  async _processMention(mention) {
    console.log(`[TwitterBot] Processing mention from @${mention.username}: "${mention.content?.slice(0, 50)}..."`);
    
    try {
      // 1. Obtener contexto del usuario que menciona
      let userContext = null;
      try {
        userContext = await this.twitter.getConversationContext(mention.username, mention.id);
      } catch (e) {
        console.warn('[TwitterBot] Could not get full context:', e.message);
      }
      
      // 2. Construir prompt con contexto
      const conversationContext = this._buildConversationContext(mention, userContext);
      
      // 3. Generar respuesta usando PersonalityEngine
      const response = await this.personality.generateContent(
        this.config.botProfile,
        {
          type: 'reply',
          context: conversationContext,
          constraints: {
            maxLength: 260, // Dejar margen para el @username
            mustInclude: [],
            mustAvoid: ['spam', 'promoción'],
          },
        }
      );
      
      if (!response.success || !response.content) {
        throw new Error('Failed to generate response');
      }
      
      // 4. Validar calidad de la respuesta
      const quality = await this.personality.scoreContentMatch(
        response.content,
        this.config.botProfile
      );
      
      if (quality.overall < 0.5) {
        console.warn('[TwitterBot] Generated response quality too low, skipping');
        return { success: false, reason: 'low_quality' };
      }
      
      // 5. Publicar respuesta (o simular en dry-run)
      if (this.config.dryRun) {
        console.log(`[TwitterBot] [DRY-RUN] Would reply to ${mention.id}:`, response.content);
        return { success: true, dryRun: true, content: response.content };
      }
      
      // Delay para parecer humano
      await this._humanDelay();
      
      const result = await this.twitter.reply(mention.id, response.content);
      
      // 6. Guardar interacción en memoria
      await this._saveInteraction(mention, response.content, result);
      
      console.log(`[TwitterBot] ✅ Replied to @${mention.username}`);
      
      return {
        success: true,
        mentionId: mention.id,
        replyId: result.tweetId,
        content: response.content,
      };
      
    } catch (error) {
      console.error(`[TwitterBot] Error processing mention:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Construir contexto de conversación para el prompt
   * @private
   */
  _buildConversationContext(mention, userContext) {
    let context = `
Usuario @${mention.username} te ha mencionado con este mensaje:
"${mention.content}"

`;

    if (userContext?.user?.bio) {
      context += `Bio del usuario: ${userContext.user.bio}\n`;
    }

    if (userContext?.userRecentActivity?.length > 0) {
      const recentTopics = userContext.userRecentActivity
        .slice(0, 3)
        .map(t => t.content?.slice(0, 100))
        .join('\n- ');
      context += `\nÚltimos tweets del usuario:\n- ${recentTopics}\n`;
    }

    if (userContext?.conversationReplies?.length > 0) {
      context += `\nEsta es una conversación en hilo, otras respuestas:\n`;
      userContext.conversationReplies.slice(0, 3).forEach(r => {
        context += `- @${r.username}: ${r.content?.slice(0, 80)}\n`;
      });
    }

    context += `
Instrucciones:
- Responde de manera natural y auténtica
- Mantén tu personalidad consistente
- No uses hashtags innecesarios
- Sé conciso (máximo 260 caracteres)
- Si no tienes algo útil que decir, puedes ser breve y amigable
`;

    return context;
  }

  /**
   * Guardar interacción en la base de datos
   * @private
   */
  async _saveInteraction(mention, reply, result) {
    try {
      await this.db.create('interactions', {
        id: `int_${Date.now()}`,
        platform: 'twitter',
        type: 'reply',
        mention_id: mention.id,
        mention_author: mention.username,
        mention_content: mention.content,
        reply_id: result?.tweetId,
        reply_content: reply,
        timestamp: new Date().toISOString(),
        profile_id: this.config.botProfile.id,
      });
    } catch (error) {
      console.warn('[TwitterBot] Could not save interaction:', error.message);
    }
  }

  /**
   * Delay humanizado para no parecer bot
   * @private
   */
  async _humanDelay() {
    const baseDelay = this.config.responseDelay;
    const jitter = Math.random() * baseDelay * 0.5; // ±50% variación
    const delay = baseDelay + jitter - (baseDelay * 0.25);
    
    console.log(`[TwitterBot] Waiting ${Math.round(delay / 1000)}s before responding...`);
    await new Promise(r => setTimeout(r, delay));
  }

  /**
   * Ejecutar un ciclo de procesamiento
   */
  async runCycle() {
    if (!this.running) return;
    
    this.stats.cyclesRun++;
    console.log(`[TwitterBot] === Cycle #${this.stats.cyclesRun} ===`);
    
    try {
      // Obtener menciones no procesadas
      const mentions = await this.twitter.getUnprocessedMentions(
        this.config.maxMentionsPerCycle
      );
      
      console.log(`[TwitterBot] Found ${mentions.length} new mentions`);
      
      for (const mention of mentions) {
        // Decidir si responder (para parecer humano)
        if (Math.random() > this.config.responseRate) {
          console.log(`[TwitterBot] Skipping mention (random) from @${mention.username}`);
          this.twitter.markAsProcessed(mention.id);
          continue;
        }
        
        // Procesar mención
        const result = await this._processMention(mention);
        
        if (result.success) {
          this.stats.repliesSent++;
        } else {
          this.stats.errors++;
        }
        
        this.stats.mentionsProcessed++;
        this.twitter.markAsProcessed(mention.id);
        
        // Verificar si todavía podemos twittear
        if (!this.twitter.canTweet()) {
          console.log('[TwitterBot] Monthly tweet limit reached, pausing replies');
          break;
        }
      }
      
    } catch (error) {
      console.error('[TwitterBot] Cycle error:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Iniciar el bot en modo continuo
   */
  async start(botProfileId) {
    if (this.running) {
      console.log('[TwitterBot] Already running');
      return;
    }
    
    await this.initialize(botProfileId);
    
    this.running = true;
    this.stats.startTime = new Date();
    
    console.log('[TwitterBot] 🚀 Starting bot...');
    console.log(`[TwitterBot] Poll interval: ${this.config.pollInterval / 1000}s`);
    console.log(`[TwitterBot] Dry run: ${this.config.dryRun}`);
    
    // Ejecutar primer ciclo inmediatamente
    await this.runCycle();
    
    // Programar ciclos siguientes
    this.pollTimer = setInterval(() => {
      this.runCycle();
    }, this.config.pollInterval);
  }

  /**
   * Detener el bot
   */
  stop() {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    console.log('[TwitterBot] 🛑 Bot stopped');
    console.log('[TwitterBot] Stats:', this.getStats());
  }

  /**
   * Obtener estadísticas del bot
   */
  getStats() {
    const uptime = this.stats.startTime 
      ? Date.now() - this.stats.startTime.getTime()
      : 0;
    
    return {
      ...this.stats,
      running: this.running,
      uptimeMs: uptime,
      uptimeHuman: this._formatUptime(uptime),
      rateLimit: this.twitter.getRateLimitStatus(),
    };
  }

  /**
   * Formatear uptime legible
   * @private
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Health check completo
   */
  async healthCheck() {
    const [twitterHealth, aiHealth] = await Promise.all([
      this.twitter.healthCheck(),
      this.ai.healthCheck(),
    ]);
    
    return {
      ok: twitterHealth.overall && aiHealth.ok,
      running: this.running,
      twitter: twitterHealth,
      ai: aiHealth,
      stats: this.getStats(),
      config: {
        dryRun: this.config.dryRun,
        pollInterval: this.config.pollInterval,
        hasProfile: !!this.config.botProfile,
      },
    };
  }

  /**
   * Publicar un tweet manual (no respuesta)
   */
  async postTweet(content) {
    if (!content || content.length > 280) {
      throw new Error('Invalid tweet content');
    }
    
    const response = await this.twitter.tweet(content);
    
    // Guardar en memoria
    try {
      await this.db.create('posts', {
        id: response.tweetId,
        platform: 'twitter',
        content,
        timestamp: new Date().toISOString(),
        profile_id: this.config.botProfile?.id,
      });
    } catch (e) {
      console.warn('[TwitterBot] Could not save post:', e.message);
    }
    
    return response;
  }
}

module.exports = { TwitterBotService };
