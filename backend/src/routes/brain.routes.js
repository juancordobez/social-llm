/**
 * Brain Routes - Endpoints REST para el cerebro IA
 * 
 * Issue #10 - Integración Backend-Cerebro
 * 
 * Base path: /api/v1/brain
 * 
 * Endpoints:
 * - POST   /decide     - Evaluar si responder a un mensaje
 * - POST   /generate   - Generar contenido (tweet, reply, etc.)
 * - POST   /analyze    - Analizar un mensaje
 * - GET    /health     - Estado del cerebro
 * - GET    /stats      - Estadísticas de uso
 * - POST   /traits     - Cargar traits de personalidad
 * - POST   /reset      - Resetear estadísticas
 */

const express = require('express');
const router = express.Router();
const brainController = require('../controllers/brain.controller');

// ============================================
// Decisión y Generación (Core)
// ============================================

/**
 * POST /brain/decide
 * Evalúa un mensaje y decide si responder + genera respuesta
 * 
 * Body:
 * {
 *   message: { id, author, content },
 *   context: { memoryContext?, conversation? },
 *   traits?: { tone, topics, vocabulary }
 * }
 * 
 * Response:
 * {
 *   action: 'respond' | 'ignore' | 'delayed',
 *   response: string | null,
 *   plan: { strategy, tone, length },
 *   evaluation: { shouldRespond, reason, confidence }
 * }
 */
router.post('/decide', brainController.decide);

/**
 * POST /brain/generate
 * Genera contenido sin proceso de decisión
 * 
 * Body:
 * {
 *   type: 'tweet' | 'reply' | 'engagement',
 *   topic?: string (para tweets),
 *   message?: { author, content } (para replies),
 *   tone?: string,
 *   plan?: { strategy, tone, length },
 *   traits?: { tone, topics }
 * }
 * 
 * Response:
 * {
 *   content: string,
 *   type: string,
 *   metadata: { ... }
 * }
 */
router.post('/generate', brainController.generate);

/**
 * POST /brain/analyze
 * Analiza un mensaje sin generar respuesta
 * 
 * Body:
 * {
 *   message: { author, content },
 *   type?: 'message' | 'profile'
 * }
 * 
 * Response:
 * {
 *   quickFilter: { passed, shouldRespond, reason },
 *   evaluation: { ... } | null,
 *   analysis: { contentLength, hasQuestion, ... }
 * }
 */
router.post('/analyze', brainController.analyze);

// ============================================
// Configuración
// ============================================

/**
 * POST /brain/traits
 * Cargar traits de personalidad
 * 
 * Body:
 * {
 *   traits: {
 *     tone: { formality, humor, enthusiasm, empathy },
 *     topics: ['tech', 'startups'],
 *     vocabulary: ['genial', 'mira']
 *   }
 * }
 */
router.post('/traits', brainController.loadTraits);

/**
 * POST /brain/reset
 * Resetear estadísticas del brain
 */
router.post('/reset', brainController.reset);

// ============================================
// Monitoreo
// ============================================

/**
 * GET /brain/health
 * Estado de salud del cerebro
 * 
 * Response:
 * {
 *   status: 'healthy' | 'initializing' | 'error',
 *   initialized: boolean,
 *   components: { decisionMaker, responseGenerator, memory },
 *   provider: string
 * }
 */
router.get('/health', brainController.health);

/**
 * GET /brain/stats
 * Estadísticas de uso
 * 
 * Response:
 * {
 *   brain: { processed, responded, ignored, errors },
 *   decisionMaker: { decisionsProcessed, ... },
 *   responseGenerator: { generated, avgLength, ... },
 *   uptime: number
 * }
 */
router.get('/stats', brainController.stats);

module.exports = router;
