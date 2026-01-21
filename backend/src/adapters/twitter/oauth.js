/**
 * OAuth 1.0a Helper
 * @description Genera firmas OAuth para Twitter API
 * 
 * Twitter usa OAuth 1.0a para autenticar peticiones.
 * Este módulo genera el header Authorization correcto.
 */

const crypto = require('crypto');

/**
 * Genera firma OAuth 1.0a para una petición
 * @param {Object} credentials - API keys y tokens
 * @param {string} method - HTTP method (POST, GET, etc)
 * @param {string} url - URL completa
 * @param {Object} params - Parámetros adicionales
 * @returns {string} Header Authorization completo
 */
function generateOAuthHeader(credentials, method, url, params = {}) {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = credentials;
  
  // Parámetros OAuth base
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Combinar todos los parámetros
  const allParams = { ...oauthParams, ...params };
  
  // Ordenar y encodear
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join('&');

  // Base string para firma
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Signing key
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;

  // Generar firma HMAC-SHA1
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // Construir header
  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
}

module.exports = { generateOAuthHeader };
