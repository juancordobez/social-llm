/**
 * Social Mimic - Twitter Module
 * @description Exporta todos los componentes de Twitter
 * 
 * Arquitectura Híbrida:
 * - Scraper (Nitter) → Lectura GRATIS
 * - API (Twitter) → Escritura (1,500/mes)
 * - Manager → Orquesta ambos
 */

const { TwitterScraperAdapter } = require('./scraper');
const { TwitterAPIAdapter } = require('./api');
const { TwitterManager } = require('./manager');
const { NITTER_INSTANCES } = require('./config');

module.exports = {
  TwitterScraperAdapter,
  TwitterAPIAdapter,
  TwitterManager,
  NITTER_INSTANCES,
};
