/**
 * Twitter Manager
 * @description Orquesta Scraper (lectura) + API (escritura)
 * 
 * Uso simple:
 *   const twitter = new TwitterManager();
 *   
 *   // LEER (gratis via Nitter)
 *   const tweets = await twitter.getUserTweets('elonmusk');
 *   const mentions = await twitter.getMentions();
 *   
 *   // ESCRIBIR (API, cuenta del límite)
 *   await twitter.tweet('Hola mundo!');
 *   await twitter.reply(tweetId, 'Gracias!');
 */

const { TwitterScraperAdapter } = require('./scraper');
const { TwitterAPIAdapter } = require('./api');

class TwitterManager {
  constructor(config = {}) {
    this.name = 'twitter-manager';
    
    // Inicializar ambos adaptadores
    this.scraper = new TwitterScraperAdapter(config.scraper || {});
    this.api = new TwitterAPIAdapter(config.api || {});
    
    // Username del bot
    this.botUsername = config.botUsername || process.env.TWITTER_BOT_USERNAME;
    
    // Cache de tweets procesados (evita duplicados)
    this._processed = new Set();
    this._maxProcessed = 1000;
  }

  // ========== LECTURA (Scraper/Nitter) ==========

  async getUserTweets(username, limit = 20) {
    return this.scraper.getUserTweets(username, limit);
  }

  async getUserProfile(username) {
    return this.scraper.getUserProfile(username);
  }

  async search(query, limit = 20) {
    return this.scraper.searchTweets(query, limit);
  }

  async getMentions(limit = 20) {
    if (!this.botUsername) {
      throw new Error('TWITTER_BOT_USERNAME no configurado');
    }
    return this.scraper.getMentions(this.botUsername, limit);
  }

  async getReplies(username, tweetId) {
    return this.scraper.getTweetReplies(username, tweetId);
  }

  // ========== ESCRITURA (API) ==========

  async tweet(text) {
    return this.api.postTweet(text);
  }

  async reply(tweetId, text) {
    return this.api.replyToTweet(tweetId, text);
  }

  async like(tweetId) {
    return this.api.likeTweet(tweetId);
  }

  async retweet(tweetId) {
    return this.api.retweet(tweetId);
  }

  async follow(userId) {
    return this.api.followUser(userId);
  }

  async deleteTweet(tweetId) {
    return this.api.deleteTweet(tweetId);
  }

  // ========== OPERACIONES COMBINADAS ==========

  /**
   * Analizar perfil + tweets recientes de un usuario
   */
  async analyzeUser(username) {
    const [profile, tweets] = await Promise.all([
      this.getUserProfile(username),
      this.getUserTweets(username, 30),
    ]);

    // Calcular estadísticas
    const avgLikes = tweets.length 
      ? tweets.reduce((sum, t) => sum + (t.stats?.likes || 0), 0) / tweets.length 
      : 0;
    const avgRetweets = tweets.length
      ? tweets.reduce((sum, t) => sum + (t.stats?.retweets || 0), 0) / tweets.length
      : 0;

    return {
      profile,
      tweets,
      analysis: {
        tweetCount: tweets.length,
        avgLikes: Math.round(avgLikes * 10) / 10,
        avgRetweets: Math.round(avgRetweets * 10) / 10,
        topTweet: tweets.sort((a, b) => (b.stats?.likes || 0) - (a.stats?.likes || 0))[0],
      },
    };
  }

  /**
   * Obtener menciones NO procesadas
   */
  async getUnprocessedMentions(limit = 20) {
    const mentions = await this.getMentions(limit);
    return mentions.filter(t => t.id && !this._processed.has(t.id));
  }

  /**
   * Marcar tweet como procesado
   */
  markAsProcessed(tweetId) {
    this._processed.add(tweetId);
    // Limpiar cache si es muy grande
    if (this._processed.size > this._maxProcessed) {
      const arr = Array.from(this._processed);
      this._processed = new Set(arr.slice(-500));
    }
  }

  /**
   * Obtener contexto de conversación
   */
  async getConversationContext(username, tweetId) {
    const [profile, thread, recentTweets] = await Promise.all([
      this.getUserProfile(username),
      this.getReplies(username, tweetId),
      this.getUserTweets(username, 10),
    ]);

    return {
      user: profile,
      originalTweet: thread.original,
      replies: thread.replies,
      userRecentActivity: recentTweets,
    };
  }

  // ========== UTILIDADES ==========

  /** ¿Podemos twittear? */
  canTweet() {
    return this.api.getRateLimitStatus().remaining > 0;
  }

  /** Estado del rate limit */
  getRateLimitStatus() {
    return this.api.getRateLimitStatus();
  }

  /** Health check completo */
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
}

module.exports = { TwitterManager };
