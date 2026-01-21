/**
 * HTML Parser for Nitter
 * @description Funciones para extraer datos del HTML de Nitter
 * 
 * Nitter es un frontend alternativo de Twitter.
 * El HTML puede cambiar entre versiones/instancias.
 */

/**
 * Limpia texto HTML
 */
function cleanHtml(text) {
  return text
    .replace(/<[^>]+>/g, '')     // Quitar tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Extrae tweets del HTML de Nitter
 * @param {string} html - HTML de la página
 * @returns {Array} Lista de tweets parseados
 */
function parseTweets(html) {
  const tweets = [];
  
  // Patrones regex para estructura de Nitter
  const patterns = {
    tweet: /<div class="timeline-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g,
    content: /<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    username: /<a class="username"[^>]*>@([^<]+)<\/a>/,
    time: /<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/,
    stats: /<span class="tweet-stat"[^>]*><div class="icon-(\w+)"[^>]*><\/div>\s*(\d+)/g,
    link: /<a class="tweet-link"[^>]*href="([^"]+)"/,
  };

  let match;
  while ((match = patterns.tweet.exec(html)) !== null) {
    const tweetHtml = match[1];
    
    // Extraer contenido
    const contentMatch = patterns.content.exec(tweetHtml);
    if (!contentMatch) continue;
    
    const content = cleanHtml(contentMatch[1]);
    if (!content) continue;
    
    // Extraer metadata
    const usernameMatch = patterns.username.exec(tweetHtml);
    const timeMatch = patterns.time.exec(tweetHtml);
    const linkMatch = patterns.link.exec(tweetHtml);
    
    // Extraer estadísticas
    const stats = { replies: 0, retweets: 0, likes: 0 };
    let statMatch;
    while ((statMatch = patterns.stats.exec(tweetHtml)) !== null) {
      const type = statMatch[1];
      const value = parseInt(statMatch[2]) || 0;
      if (type === 'comment') stats.replies = value;
      if (type === 'retweet') stats.retweets = value;
      if (type === 'heart') stats.likes = value;
    }
    
    // Construir tweet
    const tweetPath = linkMatch ? linkMatch[1] : null;
    
    tweets.push({
      id: tweetPath?.split('/').pop()?.replace('#m', '') || null,
      username: usernameMatch ? usernameMatch[1] : 'unknown',
      content,
      timestamp: timeMatch ? timeMatch[1] : null,
      stats,
      url: tweetPath ? `https://twitter.com${tweetPath}` : null,
    });
  }
  
  return tweets;
}

/**
 * Extrae perfil de usuario del HTML de Nitter
 * @param {string} html - HTML de la página de perfil
 * @param {string} username - Username para fallback
 * @returns {Object} Datos del perfil
 */
function parseProfile(html, username) {
  const patterns = {
    name: /<a class="profile-card-fullname"[^>]*>([^<]+)<\/a>/,
    bio: /<div class="profile-bio"[^>]*>([\s\S]*?)<\/div>/,
    posts: /<li class="posts"[^>]*><span class="profile-stat-header">Posts<\/span><span class="profile-stat-num">([^<]+)<\/span>/,
    followers: /<li class="followers"[^>]*>[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/,
    following: /<li class="following"[^>]*>[\s\S]*?<span class="profile-stat-num">([^<]+)<\/span>/,
  };

  return {
    username,
    name: patterns.name.exec(html)?.[1]?.trim() || username,
    bio: cleanHtml(patterns.bio.exec(html)?.[1] || ''),
    posts: patterns.posts.exec(html)?.[1]?.replace(/,/g, '') || '0',
    followers: patterns.followers.exec(html)?.[1]?.replace(/,/g, '') || '0',
    following: patterns.following.exec(html)?.[1]?.replace(/,/g, '') || '0',
  };
}

module.exports = {
  cleanHtml,
  parseTweets,
  parseProfile,
};
