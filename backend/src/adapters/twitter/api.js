/**
 * Twitter API Adapter
 * @description Escribe en Twitter via API oficial (Free Tier)
 * 
 * Límites Free Tier:
 * - 1,500 tweets/mes (~50/día)
 * - Solo escritura (POST)
 * - No puede leer timeline
 * 
 * Para LEER usar TwitterScraperAdapter
 */

const { DEFAULT_CONFIG } = require('./config');
const { generateOAuthHeader } = require('./oauth');

class TwitterAPIAdapter {
  constructor(config = {}) {
    this.name = 'twitter-api';
    
    // Credenciales (de .env o config)
    this.credentials = {
      apiKey: config.apiKey || process.env.TWITTER_API_KEY,
      apiSecret: config.apiSecret || process.env.TWITTER_API_SECRET,
      accessToken: config.accessToken || process.env.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: config.accessTokenSecret || process.env.TWITTER_ACCESS_TOKEN_SECRET,
    };
    
    this.bearerToken = config.bearerToken || process.env.TWITTER_BEARER_TOKEN;
    this.baseUrl = DEFAULT_CONFIG.api.baseUrl;
    this.version = DEFAULT_CONFIG.api.version;
    
    // Control de rate limit
    this.monthlyTweets = 0;
    this.monthlyLimit = DEFAULT_CONFIG.api.monthlyLimit;
    this.lastResetMonth = new Date().toISOString().slice(0, 7);
    
    // Cache de user ID
    this._userId = null;
  }

  /** Verificar si tenemos credenciales */
  hasCredentials() {
    const { apiKey, apiSecret, accessToken, accessTokenSecret } = this.credentials;
    return !!(apiKey && apiSecret && accessToken && accessTokenSecret);
  }

  /** Verificar límite mensual */
  _checkLimit() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (currentMonth !== this.lastResetMonth) {
      this.monthlyTweets = 0;
      this.lastResetMonth = currentMonth;
    }
    if (this.monthlyTweets >= this.monthlyLimit) {
      throw new Error(`Límite mensual alcanzado (${this.monthlyLimit})`);
    }
  }

  /**
   * Hacer petición autenticada
   * @private
   */
  async _request(method, endpoint, body = null) {
    if (!this.hasCredentials()) {
      throw new Error('Credenciales no configuradas. Ver .env.example');
    }

    const url = `${this.baseUrl}/${this.version}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': generateOAuthHeader(this.credentials, method, url),
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    console.log(`[TwitterAPI] ${method} ${endpoint}`);
    
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const msg = data.detail || data.errors?.[0]?.message || 'Error desconocido';
      throw new Error(`Twitter API (${response.status}): ${msg}`);
    }

    return data;
  }

  // ========== MÉTODOS DE ESCRITURA ==========

  /**
   * Publicar tweet
   * @param {string} text - Texto (máx 280 caracteres)
   * @param {Object} options - { replyToId, quoteTweetId }
   */
  async postTweet(text, options = {}) {
    this._checkLimit();
    
    if (text.length > 280) {
      throw new Error(`Tweet muy largo: ${text.length} (máx 280)`);
    }

    const body = { text };
    if (options.replyToId) {
      body.reply = { in_reply_to_tweet_id: options.replyToId };
    }
    if (options.quoteTweetId) {
      body.quote_tweet_id = options.quoteTweetId;
    }

    const result = await this._request('POST', '/tweets', body);
    this.monthlyTweets++;
    
    console.log(`[TwitterAPI] Tweet publicado (${this.monthlyTweets}/${this.monthlyLimit})`);
    
    return {
      success: true,
      tweetId: result.data?.id,
      text: result.data?.text,
      monthlyUsage: this.getRateLimitStatus(),
    };
  }

  /** Responder a un tweet */
  async replyToTweet(tweetId, text) {
    return this.postTweet(text, { replyToId: tweetId });
  }

  /** Eliminar tweet */
  async deleteTweet(tweetId) {
    return this._request('DELETE', `/tweets/${tweetId}`);
  }

  /** Dar like */
  async likeTweet(tweetId) {
    const userId = await this._getUserId();
    return this._request('POST', `/users/${userId}/likes`, { tweet_id: tweetId });
  }

  /** Retweet */
  async retweet(tweetId) {
    const userId = await this._getUserId();
    return this._request('POST', `/users/${userId}/retweets`, { tweet_id: tweetId });
  }

  /** Seguir usuario */
  async followUser(targetUserId) {
    const userId = await this._getUserId();
    return this._request('POST', `/users/${userId}/following`, { target_user_id: targetUserId });
  }

  // ========== UTILIDADES ==========

  /** Obtener ID del usuario autenticado (cache) */
  async _getUserId() {
    if (!this._userId) {
      const result = await this._request('GET', '/users/me');
      this._userId = result.data?.id;
    }
    return this._userId;
  }

  /** Estado del rate limit */
  getRateLimitStatus() {
    return {
      used: this.monthlyTweets,
      limit: this.monthlyLimit,
      remaining: this.monthlyLimit - this.monthlyTweets,
      percentUsed: ((this.monthlyTweets / this.monthlyLimit) * 100).toFixed(1),
    };
  }

  /** Health check */
  async healthCheck() {
    if (!this.hasCredentials()) {
      return {
        ok: false,
        message: 'Credenciales no configuradas',
        details: {
          hasApiKey: !!this.credentials.apiKey,
          hasApiSecret: !!this.credentials.apiSecret,
          hasAccessToken: !!this.credentials.accessToken,
          hasAccessTokenSecret: !!this.credentials.accessTokenSecret,
        },
      };
    }

    try {
      const user = await this._request('GET', '/users/me');
      return {
        ok: true,
        message: `Conectado como @${user.data?.username}`,
        user: user.data,
        rateLimit: this.getRateLimitStatus(),
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }
}

module.exports = { TwitterAPIAdapter };
