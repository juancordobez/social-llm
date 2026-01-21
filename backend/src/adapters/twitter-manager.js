/**
 * Social Mimic - Twitter Manager
 * @description Orquestador híbrido que combina:
 *   - TwitterScraperAdapter (Nitter) → LECTURA gratuita
 *   - TwitterAPIAdapter (API Free) → ESCRITURA (1,500 tweets/mes)
 * 
 * Uso:
 *   const twitter = new TwitterManager();
 *   const mentions = await twitter.getMentions('mibot');  // Lee via Nitter
 *   await twitter.reply(tweetId, 'Hola!');                // Escribe via API
 */

const { TwitterScraperAdapter } = require('./twitter-scraper.adapter');
const { TwitterAPIAdapter } = require('./twitter-api.adapter');

class TwitterManager {
  constructor(config = {}) {
    this.name = 'twitter-manager';
    
    // Inicializar ambos adaptadores
    this.scraper = new TwitterScraperAdapter(config.scraper || {});
    this.api = new TwitterAPIAdapter(config.api || {});
    
    // Username del bot (se configura o detecta)
    this.botUsername = config.botUsername || process.env.TWITTER_BOT_USERNAME;
    
    // Cache simple para evitar responder tweets duplicados
    this.processedTweets = new Set();
    this.maxProcessedCache = 1000;
  }

  // ==================== LECTURA (via Nitter Scraping) ====================

  /**
   * Obtener tweets de un usuario
   */
  async getUserTweets(username, limit = 20) {
    return this.scraper.getUserTweets(username, limit);
  }

  /**
   * Obtener perfil de usuario
   */
  async getUserProfile(username) {
    return this.scraper.getUserProfile(username);
  }

  /**
   * Buscar tweets
   */
  async search(query, limit = 20) {
    return this.scraper.searchTweets(query, limit);
  }

  /**
   * Obtener menciones al bot
   */
  async getMentions(limit = 20) {
    if (!this.botUsername) {
      throw new Error('Bot username not configured. Set TWITTER_BOT_USERNAME');
    }
    return this.scraper.getMentions(this.botUsername, limit);
  }

  /**
   * Obtener respuestas a un tweet
   */
  async getReplies(username, tweetId) {
    return this.scraper.getTweetReplies(username, tweetId);
  }

  /**
   * Obtener trending topics
   */
  async getTrending() {
    return this.scraper.getTrending();
  }

  // ==================== ESCRITURA (via Twitter API) ====================

  /**
   * Publicar un tweet
   */
  async tweet(text) {
    return this.api.postTweet(text);
  }

  /**
   * Responder a un tweet
   */
  async reply(tweetId, text) {
    return this.api.replyToTweet(tweetId, text);
  }

  /**
   * Dar like a un tweet
   */
  async like(tweetId) {
    return this.api.likeTweet(tweetId);
  }

  /**
   * Retweetear
   */
  async retweet(tweetId) {
    return this.api.retweet(tweetId);
  }

  /**
   * Seguir a un usuario
   */
  async follow(userId) {
    return this.api.followUser(userId);
  }

  /**
   * Eliminar un tweet
   */
  async deleteTweet(tweetId) {
    return this.api.deleteTweet(tweetId);
  }

  // ==================== OPERACIONES COMBINADAS ====================

  /**
   * Analizar un usuario: obtener perfil + últimos tweets
   * Útil para "conocer" a alguien antes de interactuar
   */
  async analyzeUser(username) {
    const [profile, tweets] = await Promise.all([
      this.getUserProfile(username),
      this.getUserTweets(username, 30),
    ]);

    return {
      profile,
      tweets,
      analysis: {
        tweetCount: tweets.length,
        avgLikes: tweets.reduce((sum, t) => sum + (t.stats?.likes || 0), 0) / tweets.length || 0,
        avgRetweets: tweets.reduce((sum, t) => sum + (t.stats?.retweets || 0), 0) / tweets.length || 0,
        topTweet: tweets.sort((a, b) => (b.stats?.likes || 0) - (a.stats?.likes || 0))[0],
        recentTopics: this._extractTopics(tweets),
      },
    };
  }

  /**
   * Extraer temas comunes de un conjunto de tweets
   * @private
   */
  _extractTopics(tweets) {
    const words = {};
    const stopWords = new Set(['el', 'la', 'de', 'que', 'y', 'a', 'en', 'es', 'the', 'and', 'is', 'to', 'of', 'for', 'in', 'on', 'with', 'https', 'http', 'co', 't']);
    
    for (const tweet of tweets) {
      const content = (tweet.content || '').toLowerCase();
      const tokens = content.split(/\s+/).filter(w => 
        w.length > 3 && 
        !stopWords.has(w) && 
        !w.startsWith('@') && 
        !w.startsWith('http')
      );
      
      for (const token of tokens) {
        words[token] = (words[token] || 0) + 1;
      }
    }

    return Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Obtener menciones NO procesadas (nuevas)
   * Para el loop principal del bot
   */
  async getUnprocessedMentions(limit = 20) {
    const mentions = await this.getMentions(limit);
    
    // Filtrar tweets ya procesados
    const newMentions = mentions.filter(tweet => {
      if (!tweet.id || this.processedTweets.has(tweet.id)) {
        return false;
      }
      return true;
    });

    return newMentions;
  }

  /**
   * Marcar un tweet como procesado
   */
  markAsProcessed(tweetId) {
    this.processedTweets.add(tweetId);
    
    // Limpiar cache si es muy grande
    if (this.processedTweets.size > this.maxProcessedCache) {
      const arr = Array.from(this.processedTweets);
      this.processedTweets = new Set(arr.slice(-500));
    }
  }

  /**
   * Obtener contexto conversacional
   * Útil para respuestas más coherentes
   */
  async getConversationContext(username, tweetId) {
    const [userProfile, tweet] = await Promise.all([
      this.getUserProfile(username),
      this.getReplies(username, tweetId),
    ]);

    const recentTweets = await this.getUserTweets(username, 10);

    return {
      user: userProfile,
      originalTweet: tweet.original,
      conversationReplies: tweet.replies,
      userRecentActivity: recentTweets,
    };
  }

  // ==================== UTILIDADES ====================

  /**
   * Health check completo
   */
  async healthCheck() {
    const [scraperHealth, apiHealth] = await Promise.all([
      this.scraper.healthCheck(),
      this.api.healthCheck(),
    ]);

    return {
      overall: scraperHealth.ok || apiHealth.ok,
      scraper: scraperHealth,
      api: apiHealth,
      botUsername: this.botUsername,
      capabilities: {
        canRead: scraperHealth.ok,
        canWrite: apiHealth.ok,
        monthlyTweetsRemaining: apiHealth.rateLimit?.remaining || 0,
      },
    };
  }

  /**
   * Obtener estado de rate limiting
   */
  getRateLimitStatus() {
    return this.api.getRateLimitStatus();
  }

  /**
   * Verificar si podemos twittear
   */
  canTweet() {
    const status = this.getRateLimitStatus();
    return status.remaining > 0;
  }
}

module.exports = { TwitterManager };
