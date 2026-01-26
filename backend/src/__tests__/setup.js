/**
 * Jest Setup File
 * 
 * Configuración global para todos los tests
 */

// Cargar variables de entorno
require('dotenv').config({ path: '.env.test' });

// Silenciar logs durante tests (opcional)
if (process.env.SILENCE_LOGS === 'true') {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
}

// Aumentar timeout para tests de LLM
jest.setTimeout(30000);

// Variables de entorno por defecto para tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

// Cleanup después de todos los tests
afterAll(async () => {
  // Dar tiempo para que las conexiones se cierren
  await new Promise(resolve => setTimeout(resolve, 500));
});
