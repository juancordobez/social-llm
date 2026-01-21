/**
 * Twitter Adapter Configuration
 * @description Constantes y configuración
 */

/**
 * Instancias públicas de Nitter (se rotan automáticamente)
 * Actualizar si alguna deja de funcionar
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

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG = {
  // Scraper
  scraper: {
    timeout: 10000,      // 10 segundos
    retries: 3,          // Intentos antes de fallar
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  
  // API
  api: {
    baseUrl: 'https://api.twitter.com',
    version: '2',
    monthlyLimit: 1500,  // Free tier
  },
};

module.exports = {
  NITTER_INSTANCES,
  DEFAULT_CONFIG,
};
