#!/usr/bin/env node

/**
 * Social Mimic - Twitter Bot CLI
 * @description Script para iniciar y probar el bot de Twitter
 * 
 * Uso:
 *   node scripts/twitter-bot.js start          # Iniciar bot en modo continuo
 *   node scripts/twitter-bot.js start --dry    # Modo prueba (no publica)
 *   node scripts/twitter-bot.js test           # Verificar conexiones
 *   node scripts/twitter-bot.js tweet "Hola!"  # Publicar tweet manual
 *   node scripts/twitter-bot.js mentions       # Ver menciones recientes
 */

require('dotenv').config();

const { TwitterBotService } = require('../src/services/twitter-bot.service');
const { getTwitter } = require('../src/adapters');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnections() {
  log('\n🔍 Testing connections...', 'cyan');
  
  const twitter = getTwitter();
  const health = await twitter.healthCheck();
  
  log('\n📊 Connection Status:', 'bright');
  
  // Scraper (Nitter)
  if (health.scraper.ok) {
    log(`  ✅ Scraper (Nitter): ${health.scraper.message}`, 'green');
  } else {
    log(`  ❌ Scraper (Nitter): ${health.scraper.message}`, 'red');
  }
  
  // API
  if (health.api.ok) {
    log(`  ✅ Twitter API: ${health.api.message}`, 'green');
    log(`     Tweets remaining: ${health.api.rateLimit.remaining}/${health.api.rateLimit.monthlyLimit}`, 'blue');
  } else {
    log(`  ❌ Twitter API: ${health.api.message}`, 'red');
    if (health.api.details) {
      log(`     API Key: ${health.api.details.hasApiKey ? '✓' : '✗'}`, 'yellow');
      log(`     API Secret: ${health.api.details.hasApiSecret ? '✓' : '✗'}`, 'yellow');
      log(`     Access Token: ${health.api.details.hasAccessToken ? '✓' : '✗'}`, 'yellow');
      log(`     Access Token Secret: ${health.api.details.hasAccessTokenSecret ? '✓' : '✗'}`, 'yellow');
    }
  }
  
  log('\n📋 Capabilities:', 'bright');
  log(`  Read (via scraping): ${health.capabilities.canRead ? '✅' : '❌'}`, health.capabilities.canRead ? 'green' : 'red');
  log(`  Write (via API): ${health.capabilities.canWrite ? '✅' : '❌'}`, health.capabilities.canWrite ? 'green' : 'red');
  
  if (health.botUsername) {
    log(`\n🤖 Bot Username: @${health.botUsername}`, 'cyan');
  } else {
    log('\n⚠️  Bot username not configured. Set TWITTER_BOT_USERNAME in .env', 'yellow');
  }
  
  return health;
}

async function getMentions(limit = 10) {
  log('\n📬 Fetching recent mentions...', 'cyan');
  
  const twitter = getTwitter();
  
  if (!process.env.TWITTER_BOT_USERNAME) {
    log('❌ TWITTER_BOT_USERNAME not set in .env', 'red');
    return;
  }
  
  try {
    const mentions = await twitter.getMentions(limit);
    
    if (mentions.length === 0) {
      log('No mentions found (or scraping failed)', 'yellow');
      return;
    }
    
    log(`\nFound ${mentions.length} mentions:\n`, 'green');
    
    for (const mention of mentions) {
      log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'blue');
      log(`@${mention.username}`, 'cyan');
      log(mention.content, 'reset');
      log(`❤️ ${mention.stats?.likes || 0}  🔁 ${mention.stats?.retweets || 0}  💬 ${mention.stats?.replies || 0}`, 'yellow');
      if (mention.timestamp) log(`🕐 ${mention.timestamp}`, 'blue');
    }
    
  } catch (error) {
    log(`❌ Error fetching mentions: ${error.message}`, 'red');
  }
}

async function postTweet(content) {
  if (!content) {
    log('❌ No tweet content provided', 'red');
    log('Usage: node scripts/twitter-bot.js tweet "Your message here"', 'yellow');
    return;
  }
  
  if (content.length > 280) {
    log(`❌ Tweet too long: ${content.length} characters (max 280)`, 'red');
    return;
  }
  
  log('\n📝 Posting tweet...', 'cyan');
  
  const bot = new TwitterBotService();
  await bot.initialize();
  
  try {
    const result = await bot.postTweet(content);
    
    if (result.success) {
      log('\n✅ Tweet posted successfully!', 'green');
      log(`Tweet ID: ${result.tweetId}`, 'blue');
      log(`Monthly usage: ${result.monthlyUsage.used}/${result.monthlyUsage.limit}`, 'yellow');
    }
  } catch (error) {
    log(`\n❌ Failed to post: ${error.message}`, 'red');
  }
}

async function startBot(dryRun = false) {
  log('\n🤖 Social Mimic - Twitter Bot', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  
  // Test connections first
  const health = await testConnections();
  
  if (!health.capabilities.canRead && !health.capabilities.canWrite) {
    log('\n❌ Cannot start bot: No read or write capabilities', 'red');
    log('Please check your configuration in .env', 'yellow');
    process.exit(1);
  }
  
  if (dryRun) {
    log('\n🧪 DRY RUN MODE - No tweets will be posted', 'yellow');
  }
  
  log('\n🚀 Starting bot...', 'cyan');
  
  const bot = new TwitterBotService({
    dryRun,
    pollInterval: 60000, // 1 minuto
    responseDelay: 5000,
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n\n🛑 Received SIGINT, shutting down...', 'yellow');
    bot.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n\n🛑 Received SIGTERM, shutting down...', 'yellow');
    bot.stop();
    process.exit(0);
  });
  
  // Start the bot
  await bot.start();
  
  // Log stats periodically
  setInterval(() => {
    const stats = bot.getStats();
    log(`\n📊 Stats | Cycles: ${stats.cyclesRun} | Processed: ${stats.mentionsProcessed} | Replies: ${stats.repliesSent} | Errors: ${stats.errors} | Uptime: ${stats.uptimeHuman}`, 'blue');
  }, 300000); // Cada 5 minutos
}

async function analyzeUser(username) {
  log(`\n🔍 Analyzing user @${username}...`, 'cyan');
  
  const twitter = getTwitter();
  
  try {
    const analysis = await twitter.analyzeUser(username);
    
    if (!analysis.profile) {
      log('❌ Could not fetch user profile', 'red');
      return;
    }
    
    log('\n👤 Profile:', 'bright');
    log(`  Name: ${analysis.profile.name}`, 'reset');
    log(`  Bio: ${analysis.profile.bio || '(none)'}`, 'reset');
    log(`  Posts: ${analysis.profile.posts}`, 'blue');
    log(`  Followers: ${analysis.profile.followers}`, 'blue');
    log(`  Following: ${analysis.profile.following}`, 'blue');
    
    log('\n📊 Tweet Analysis:', 'bright');
    log(`  Tweets fetched: ${analysis.analysis.tweetCount}`, 'reset');
    log(`  Avg Likes: ${analysis.analysis.avgLikes.toFixed(1)}`, 'reset');
    log(`  Avg Retweets: ${analysis.analysis.avgRetweets.toFixed(1)}`, 'reset');
    
    if (analysis.analysis.recentTopics.length > 0) {
      log('\n📌 Common Topics:', 'bright');
      analysis.analysis.recentTopics.slice(0, 5).forEach(t => {
        log(`  • ${t.word} (${t.count})`, 'reset');
      });
    }
    
    if (analysis.analysis.topTweet) {
      log('\n⭐ Top Tweet:', 'bright');
      log(`  "${analysis.analysis.topTweet.content?.slice(0, 100)}..."`, 'cyan');
      log(`  ❤️ ${analysis.analysis.topTweet.stats?.likes || 0}`, 'yellow');
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'start':
      const dryRun = args.includes('--dry') || args.includes('-d');
      await startBot(dryRun);
      break;
      
    case 'test':
      await testConnections();
      break;
      
    case 'mentions':
      await getMentions(parseInt(args[1]) || 10);
      break;
      
    case 'tweet':
      await postTweet(args.slice(1).join(' '));
      break;
      
    case 'analyze':
      if (!args[1]) {
        log('Usage: node scripts/twitter-bot.js analyze <username>', 'yellow');
      } else {
        await analyzeUser(args[1].replace('@', ''));
      }
      break;
      
    default:
      log('\n🤖 Social Mimic - Twitter Bot CLI', 'bright');
      log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
      log('\nCommands:', 'cyan');
      log('  start [--dry]     Start the bot (--dry for test mode)', 'reset');
      log('  test              Test connections', 'reset');
      log('  mentions [n]      Show recent mentions', 'reset');
      log('  tweet "message"   Post a tweet', 'reset');
      log('  analyze @user     Analyze a user profile', 'reset');
      log('\nExamples:', 'cyan');
      log('  node scripts/twitter-bot.js start --dry', 'yellow');
      log('  node scripts/twitter-bot.js tweet "Hello world!"', 'yellow');
      log('  node scripts/twitter-bot.js analyze @elonmusk', 'yellow');
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
