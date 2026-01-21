/**
 * Social Mimic - Twitter Scraper Adapter
 * @description Lectura de Twitter via Nitter (scraping) - GRATIS
 * 
 * Nitter es un frontend alternativo de Twitter que permite
 * leer tweets sin necesidad de API keys.
 * 
 * ⚠️ Solo lectura. Para escribir, usar TwitterAPIAdapter.
 */

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.cz',
  'https://nitter.unixfox.eu',
  'https://nitter.d420.de',
  'https://nitter.fdn.fr',
  'https://nitter.1d4.us',
  'https://nitter.kavin.rocks',
];

class TwitterScraperAdapter {
  constructor(config = {}) {
    this.name = 'twitter-scraper';
    this.instances = config.instances || NITTER_INSTANCES;
    this.currentInstanceIndex = 0;
    this.userAgent = config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
  }

  /**
   * Get current Nitter instance, rotate on failure
   */
  get baseUrl() {
    return this.instances[this.currentInstanceIndex];
  }

  /**
   * Rotate to next instance on failure
   */
  rotateInstance() {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.instances.length;
    console.log(`[TwitterScraper] Rotated to instance: ${this.baseUrl}`);
  }

  /**
   * Make HTTP request with retries and instance rotation
   * @private
   */
  async _fetch(path, options = {}) {
    let lastError;
    
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const url = `${this.baseUrl}${path}`;
        console.log(`[TwitterScraper] Fetching: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller.signal,
          ...options,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
      } catch (error) {
        lastError = error;
        console.warn(`[TwitterScraper] Attempt ${attempt + 1} failed:`, error.message);
        this.rotateInstance();
        
        // Small delay before retry
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    
    throw new Error(`All Nitter instances failed. Last error: ${lastError.message}`);
  }

  /**
   * Parse tweets from Nitter HTML
   * @private
   */
  _parseTweets(html) {
    const tweets = [];
    
    // Regex patterns for Nitter HTML structure
    const tweetPattern = /<div class="timeline-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    const contentPattern = /<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const usernamePattern = /<a class="username"[^>]*>@([^<]+)<\/a>/;
    const timePattern = /<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/;
    const statsPattern = /<span class="tweet-stat"[^>]*><div class="icon-(\w+)"[^>]*><\/div>\s*(\d+)/g;
    const linkPattern = /<a class="tweet-link"[^>]*href="([^"]+)"/;
    
    let match;
    while ((match = tweetPattern.exec(html)) !== null) {
      const tweetHtml = match[1];
      
      // Extract content
      const contentMatch = contentPattern.exec(tweetHtml);
      if (!contentMatch) continue;
      
      // Clean HTML tags from content
      const content = contentMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      
      // Extract username
      const usernameMatch = usernamePattern.exec(tweetHtml);
      const username = usernameMatch ? usernameMatch[1] : 'unknown';
      
      // Extract timestamp
      const timeMatch = timePattern.exec(tweetHtml);
      const timestamp = timeMatch ? timeMatch[1] : null;
      
      // Extract link/ID
      const linkMatch = linkPattern.exec(tweetHtml);
      const tweetPath = linkMatch ? linkMatch[1] : null;
      const tweetId = tweetPath ? tweetPath.split('/').pop()?.replace('#m', '') : null;
      
      // Extract stats
      const stats = { replies: 0, retweets: 0, likes: 0 };
      let statMatch;
      while ((statMatch = statsPattern.exec(tweetHtml)) !== null) {
        const type = statMatch[1];
        const value = parseInt(statMatch[2]) || 0;
        if (type === 'comment') stats.replies = value;
        if (type === 'retweet') stats.retweets = value;
        if (type === 'heart') stats.likes = value;
      }
      
      if (content && content.length > 0) {
        tweets.push({
          id: tweetId,
          username,
          content,
          timestamp,
          stats,
          url: tweetPath ? `https://twitter.com${tweetPath}` : null,
        });
      }
    }
    
    return tweets;
  }

  // ==================== PUBLIC API ====================

  /**
   * Get tweets from a user's timeline
   * @param {string} username - Twitter username (without @)
   * @param {number} limit - Max tweets to fetch
   */
  async getUserTweets(username, limit = 20) {
    try {
      const html = await this._fetch(`/${username}`);
      const tweets = this._parseTweets(html);
      return tweets.slice(0, limit);
    } catch (error) {
      console.error(`[TwitterScraper] Failed to get tweets for @${username}:`, error.message);
      return [];
    }
  }

  /**
   * Get a user's profile info
   * @param {string} username - Twitter username
   */
  async getUserProfile(username) {
    try {
      const html = await this._fetch(`/${username}`);
      
      // Parse profile info from HTML
      const nameMatch = /<a class="profile-card-fullname"[^>]*>([^<]+)<\/a>/.exec(html);
      const bioMatch = /<div class="profile-bio"[^>]*>([\s\S]*?)<\/div>/.exec(html);
      const statsMatch = /<li class="posts"[^>]*><span class="profile-stat-header">Posts<\/span><span class="profile-stat-num">([^<]+)<\/span>/.exec(html);
      const followersMatch = /<li class="followers"[^>]*>[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/.exec(html);
      const followingMatch = /<li class="following"[^>]*>[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/.exec(html);
      
      return {
        username,
        name: nameMatch ? nameMatch[1].trim() : username,
        bio: bioMatch ? bioMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        posts: statsMatch ? statsMatch[1].replace(/,/g, '') : '0',
        followers: followersMatch ? followersMatch[1].replace(/,/g, '') : '0',
        following: followingMatch ? followingMatch[1].replace(/,/g, '') : '0',
      };
    } catch (error) {
      console.error(`[TwitterScraper] Failed to get profile for @${username}:`, error.message);
      return null;
    }
  }

  /**
   * Search tweets by query
   * @param {string} query - Search query
   * @param {number} limit - Max results
   */
  async searchTweets(query, limit = 20) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const html = await this._fetch(`/search?f=tweets&q=${encodedQuery}`);
      const tweets = this._parseTweets(html);
      return tweets.slice(0, limit);
    } catch (error) {
      console.error(`[TwitterScraper] Search failed for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Get mentions of a user
   * @param {string} username - Username to find mentions of
   * @param {number} limit - Max results
   */
  async getMentions(username, limit = 20) {
    return this.searchTweets(`@${username}`, limit);
  }

  /**
   * Get replies to a specific tweet
   * @param {string} username - Tweet author
   * @param {string} tweetId - Tweet ID
   */
  async getTweetReplies(username, tweetId) {
    try {
      const html = await this._fetch(`/${username}/status/${tweetId}`);
      const tweets = this._parseTweets(html);
      // First tweet is the original, rest are replies
      return {
        original: tweets[0] || null,
        replies: tweets.slice(1),
      };
    } catch (error) {
      console.error(`[TwitterScraper] Failed to get replies:`, error.message);
      return { original: null, replies: [] };
    }
  }

  /**
   * Get trending topics (from Nitter explore)
   */
  async getTrending() {
    try {
      // Note: Nitter doesn't always have trends, this is best-effort
      const html = await this._fetch('/explore');
      
      // Try to extract trending topics
      const trends = [];
      const trendPattern = /<div class="trend"[^>]*>([\s\S]*?)<\/div>/g;
      
      let match;
      while ((match = trendPattern.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        if (text) trends.push(text);
      }
      
      return trends;
    } catch (error) {
      console.error('[TwitterScraper] Failed to get trends:', error.message);
      return [];
    }
  }

  /**
   * Health check - verify at least one instance works
   */
  async healthCheck() {
    try {
      // Try to fetch a known public profile
      const profile = await this.getUserProfile('elonmusk');
      
      if (profile) {
        return {
          ok: true,
          message: `Nitter working via ${this.baseUrl}`,
          instance: this.baseUrl,
        };
      }
      
      return {
        ok: false,
        message: 'Could not fetch test profile',
      };
    } catch (error) {
      return {
        ok: false,
        message: `Nitter health check failed: ${error.message}`,
      };
    }
  }
}

module.exports = { TwitterScraperAdapter, NITTER_INSTANCES };
