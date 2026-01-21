/**
 * Twitter Scraper Adapter
 * @description Lee Twitter via Nitter (scraping) - GRATIS, ilimitado
 * 
 * ¿Qué es Nitter?
 * Frontend alternativo de Twitter que no requiere cuenta ni API.
 * Permite leer tweets públicos de cualquier usuario.
 * 
 * Limitaciones:
 * - Solo lectura (no puede publicar)
 * - Solo tweets públicos
 * - Puede fallar si Nitter está caído (rotamos instancias)
 */

const { NITTER_INSTANCES, DEFAULT_CONFIG } = require('./config');
const { parseTweets, parseProfile } = require('./parser');

class TwitterScraperAdapter {
  constructor(config = {}) {
    this.name = 'twitter-scraper';
    this.instances = config.instances || NITTER_INSTANCES;
    this.currentIndex = 0;
    this.timeout = config.timeout || DEFAULT_CONFIG.scraper.timeout;
    this.retries = config.retries || DEFAULT_CONFIG.scraper.retries;
    this.userAgent = config.userAgent || DEFAULT_CONFIG.scraper.userAgent;
  }

  /** URL base actual */
  get baseUrl() {
    return this.instances[this.currentIndex];
  }

  /** Rotar a siguiente instancia */
  rotateInstance() {
    this.currentIndex = (this.currentIndex + 1) % this.instances.length;
    console.log(`[Scraper] Rotated to: ${this.baseUrl}`);
  }

  /**
   * Hacer petición HTTP con reintentos
   * @private
   */
  async _fetch(path) {
    let lastError;
    
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`;
        console.log(`[Scraper] GET ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.text();
        
      } catch (error) {
        lastError = error;
        console.warn(`[Scraper] Attempt ${attempt + 1} failed: ${error.message}`);
        this.rotateInstance();
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    
    throw new Error(`All instances failed: ${lastError.message}`);
  }

  // ========== MÉTODOS PÚBLICOS ==========

  /**
   * Obtener tweets de un usuario
   */
  async getUserTweets(username, limit = 20) {
    try {
      const html = await this._fetch(`/${username}`);
      return parseTweets(html).slice(0, limit);
    } catch (error) {
      console.error(`[Scraper] getUserTweets failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener perfil de usuario
   */
  async getUserProfile(username) {
    try {
      const html = await this._fetch(`/${username}`);
      return parseProfile(html, username);
    } catch (error) {
      console.error(`[Scraper] getUserProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Buscar tweets
   */
  async searchTweets(query, limit = 20) {
    try {
      const encoded = encodeURIComponent(query);
      const html = await this._fetch(`/search?f=tweets&q=${encoded}`);
      return parseTweets(html).slice(0, limit);
    } catch (error) {
      console.error(`[Scraper] searchTweets failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener menciones de un usuario
   */
  async getMentions(username, limit = 20) {
    return this.searchTweets(`@${username}`, limit);
  }

  /**
   * Obtener respuestas a un tweet
   */
  async getTweetReplies(username, tweetId) {
    try {
      const html = await this._fetch(`/${username}/status/${tweetId}`);
      const tweets = parseTweets(html);
      return {
        original: tweets[0] || null,
        replies: tweets.slice(1),
      };
    } catch (error) {
      console.error(`[Scraper] getTweetReplies failed: ${error.message}`);
      return { original: null, replies: [] };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const profile = await this.getUserProfile('twitter');
      return profile ? {
        ok: true,
        message: `Working via ${this.baseUrl}`,
        instance: this.baseUrl,
      } : {
        ok: false,
        message: 'Could not fetch test profile',
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }
}

module.exports = { TwitterScraperAdapter };
