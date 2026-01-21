/**
 * Social Mimic - Twitter API Adapter
 * @description Escritura en Twitter via API oficial (Free Tier)
 * 
 * Límites Free Tier:
 * - 1,500 tweets/mes (50/día promedio)
 * - Solo POST (escribir)
 * - NO lectura de timeline
 * 
 * Para LEER, usar TwitterScraperAdapter (Nitter)
 */

const crypto = require('crypto');

class TwitterAPIAdapter {
  constructor(config = {}) {
    this.name = 'twitter-api';
    
    // API Keys - Obtener de https://developer.twitter.com
    this.apiKey = config.apiKey || process.env.TWITTER_API_KEY;
    this.apiSecret = config.apiSecret || process.env.TWITTER_API_SECRET;
    this.accessToken = config.accessToken || process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = config.accessTokenSecret || process.env.TWITTER_ACCESS_TOKEN_SECRET;
    this.bearerToken = config.bearerToken || process.env.TWITTER_BEARER_TOKEN;
    
    this.baseUrl = 'https://api.twitter.com';
    this.apiVersion = '2'; // Twitter API v2
    
    // Rate limiting tracking
    this.monthlyTweets = 0;
    this.monthlyLimit = 1500;
    this.lastResetDate = new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  /**
   * Check if we have all required credentials
   */
  hasCredentials() {
    return !!(this.apiKey && this.apiSecret && this.accessToken && this.accessTokenSecret);
  }

  /**
   * Check and update monthly limit
   * @private
   */
  _checkMonthlyLimit() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    if (currentMonth !== this.lastResetDate) {
      // New month, reset counter
      this.monthlyTweets = 0;
      this.lastResetDate = currentMonth;
    }
    
    if (this.monthlyTweets >= this.monthlyLimit) {
      throw new Error(`Monthly tweet limit reached (${this.monthlyLimit}). Resets next month.`);
    }
  }

  /**
   * Generate OAuth 1.0a signature
   * @private
   */
  _generateOAuthSignature(method, url, params) {
    const oauthParams = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.accessToken,
      oauth_version: '1.0',
    };

    // Combine all params
    const allParams = { ...oauthParams, ...params };
    
    // Sort and encode
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    // Create signature base string
    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(this.apiSecret)}&${encodeURIComponent(this.accessTokenSecret)}`;

    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');

    oauthParams.oauth_signature = signature;

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return authHeader;
  }

  /**
   * Make authenticated request to Twitter API
   * @private
   */
  async _request(method, endpoint, body = null) {
    if (!this.hasCredentials()) {
      throw new Error('Twitter API credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET');
    }

    const url = `${this.baseUrl}/${this.apiVersion}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
    };

    // Use OAuth 1.0a for user-context requests
    headers['Authorization'] = this._generateOAuthSignature(method, url, {});

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[TwitterAPI] ${method} ${endpoint}`);

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.detail || data.error || data.errors?.[0]?.message || 'Unknown error';
      throw new Error(`Twitter API Error (${response.status}): ${errorMsg}`);
    }

    return data;
  }

  // ==================== PUBLIC API (WRITE OPERATIONS) ====================

  /**
   * Post a new tweet
   * @param {string} text - Tweet content (max 280 chars)
   * @param {object} options - Additional options
   */
  async postTweet(text, options = {}) {
    this._checkMonthlyLimit();

    if (text.length > 280) {
      throw new Error(`Tweet too long: ${text.length} chars (max 280)`);
    }

    const body = { text };

    // Optional: Reply to another tweet
    if (options.replyToId) {
      body.reply = { in_reply_to_tweet_id: options.replyToId };
    }

    // Optional: Quote tweet
    if (options.quoteTweetId) {
      body.quote_tweet_id = options.quoteTweetId;
    }

    const result = await this._request('POST', '/tweets', body);
    
    this.monthlyTweets++;
    console.log(`[TwitterAPI] Tweet posted! (${this.monthlyTweets}/${this.monthlyLimit} this month)`);
    
    return {
      success: true,
      tweetId: result.data?.id,
      text: result.data?.text,
      monthlyUsage: {
        used: this.monthlyTweets,
        limit: this.monthlyLimit,
        remaining: this.monthlyLimit - this.monthlyTweets,
      },
    };
  }

  /**
   * Reply to a tweet
   * @param {string} tweetId - ID of tweet to reply to
   * @param {string} text - Reply content
   */
  async replyToTweet(tweetId, text) {
    return this.postTweet(text, { replyToId: tweetId });
  }

  /**
   * Delete a tweet
   * @param {string} tweetId - ID of tweet to delete
   */
  async deleteTweet(tweetId) {
    return this._request('DELETE', `/tweets/${tweetId}`);
  }

  /**
   * Like a tweet
   * @param {string} tweetId - ID of tweet to like
   */
  async likeTweet(tweetId) {
    // Need user ID for this endpoint
    const userId = await this._getAuthenticatedUserId();
    return this._request('POST', `/users/${userId}/likes`, { tweet_id: tweetId });
  }

  /**
   * Unlike a tweet
   * @param {string} tweetId - ID of tweet to unlike
   */
  async unlikeTweet(tweetId) {
    const userId = await this._getAuthenticatedUserId();
    return this._request('DELETE', `/users/${userId}/likes/${tweetId}`);
  }

  /**
   * Retweet
   * @param {string} tweetId - ID of tweet to retweet
   */
  async retweet(tweetId) {
    const userId = await this._getAuthenticatedUserId();
    return this._request('POST', `/users/${userId}/retweets`, { tweet_id: tweetId });
  }

  /**
   * Remove retweet
   * @param {string} tweetId - ID of tweet to unretweet
   */
  async undoRetweet(tweetId) {
    const userId = await this._getAuthenticatedUserId();
    return this._request('DELETE', `/users/${userId}/retweets/${tweetId}`);
  }

  /**
   * Follow a user
   * @param {string} targetUserId - ID of user to follow
   */
  async followUser(targetUserId) {
    const userId = await this._getAuthenticatedUserId();
    return this._request('POST', `/users/${userId}/following`, { target_user_id: targetUserId });
  }

  /**
   * Unfollow a user
   * @param {string} targetUserId - ID of user to unfollow
   */
  async unfollowUser(targetUserId) {
    const userId = await this._getAuthenticatedUserId();
    return this._request('DELETE', `/users/${userId}/following/${targetUserId}`);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get authenticated user's ID (cached)
   * @private
   */
  async _getAuthenticatedUserId() {
    if (this._cachedUserId) {
      return this._cachedUserId;
    }

    // Get user info using bearer token
    const result = await this._request('GET', '/users/me');
    this._cachedUserId = result.data?.id;
    return this._cachedUserId;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return {
      monthlyTweets: this.monthlyTweets,
      monthlyLimit: this.monthlyLimit,
      remaining: this.monthlyLimit - this.monthlyTweets,
      resetDate: `${this.lastResetDate}-01`,
      percentUsed: ((this.monthlyTweets / this.monthlyLimit) * 100).toFixed(1),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.hasCredentials()) {
      return {
        ok: false,
        message: 'Twitter API credentials not configured',
        details: {
          hasApiKey: !!this.apiKey,
          hasApiSecret: !!this.apiSecret,
          hasAccessToken: !!this.accessToken,
          hasAccessTokenSecret: !!this.accessTokenSecret,
        },
      };
    }

    try {
      // Try to get authenticated user info
      const user = await this._request('GET', '/users/me');
      
      return {
        ok: true,
        message: `Connected as @${user.data?.username}`,
        user: {
          id: user.data?.id,
          username: user.data?.username,
          name: user.data?.name,
        },
        rateLimit: this.getRateLimitStatus(),
      };
    } catch (error) {
      return {
        ok: false,
        message: `Twitter API error: ${error.message}`,
      };
    }
  }
}

module.exports = { TwitterAPIAdapter };
