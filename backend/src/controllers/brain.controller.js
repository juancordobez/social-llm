/**
 * Brain Controller - Endpoints para interactuar con el cerebro IA
 * 
 * Issue #10 - Integración Backend-Cerebro
 * 
 * Endpoints:
 * - POST /brain/decide - Evaluar si responder a un mensaje
 * - POST /brain/generate - Generar respuesta/contenido
 * - POST /brain/analyze - Analizar mensaje o perfil
 * - GET  /brain/health - Estado del cerebro
 * - GET  /brain/stats - Estadísticas de uso
 * 
 * Features:
 * - Circuit Breaker para resiliencia ante fallos de LLM
 * 
 * @todo Implementar sistema de colas (Cloud Tasks/Pub-Sub) para operaciones async
 */

// Ruta: backend/src/controllers/ -> brain/ (3 niveles arriba)
const { Brain } = require('../../../brain');
const { getCircuitBreaker, getAllBreakersStatus } = require('../core/circuit-breaker');

// Circuit breaker para llamadas al LLM
const llmBreaker = getCircuitBreaker('llm-api', {
  failureThreshold: 5,      // 5 fallos consecutivos abren el circuito
  successThreshold: 2,      // 2 éxitos para cerrar desde half-open
  timeout: 30000,           // 30 segundos antes de reintentar
});

// Singleton del Brain para reutilizar entre requests
let brainInstance = null;
let brainInitializing = false;

/**
 * Obtener o crear instancia del Brain
 */
async function getBrain() {
  if (brainInstance) return brainInstance;
  
  if (brainInitializing) {
    // Esperar a que termine la inicialización
    while (brainInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return brainInstance;
  }

  brainInitializing = true;
  
  try {
    brainInstance = new Brain({ provider: 'groq' });
    await brainInstance.initialize();
    console.log('[BrainController] Brain inicializado ✓');
  } finally {
    brainInitializing = false;
  }
  
  return brainInstance;
}

/**
 * POST /brain/decide
 * Evalúa si el bot debería responder a un mensaje
 */
async function decide(req, res) {
  try {
    // Verificar circuit breaker antes de procesar
    if (!llmBreaker.canExecute()) {
      const status = llmBreaker.getStatus();
      return res.status(503).json({
        success: false,
        error: 'Servicio de IA temporalmente no disponible',
        code: 'CIRCUIT_OPEN',
        retryAfter: status.nextAttempt,
        circuitBreaker: status,
      });
    }

    const { message, context = {} } = req.body;

    if (!message || !message.content) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere message.content',
      });
    }

    const brain = await getBrain();
    
    // Cargar traits si se proporcionan
    if (req.body.traits) {
      brain.loadTraits(req.body.traits);
    }

    const result = await brain.process(message, context);
    
    // Marcar éxito en el circuit breaker
    llmBreaker.onSuccess();

    res.json({
      success: true,
      data: {
        action: result.action,
        response: result.response || null,
        plan: result.plan || null,
        evaluation: result.evaluation || null,
        timing: result.timing || null,
        reason: result.reason || null,
      },
      meta: {
        processedAt: new Date().toISOString(),
        stats: result.stats,
      },
    });

  } catch (error) {
    // Marcar fallo en el circuit breaker
    llmBreaker.onFailure();
    
    console.error('[BrainController] Error en decide:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BRAIN_DECIDE_ERROR',
    });
  }
}

/**
 * POST /brain/generate
 * Genera contenido (tweet, respuesta, etc.)
 */
async function generate(req, res) {
  try {
    // Verificar circuit breaker antes de procesar
    if (!llmBreaker.canExecute()) {
      const status = llmBreaker.getStatus();
      return res.status(503).json({
        success: false,
        error: 'Servicio de IA temporalmente no disponible',
        code: 'CIRCUIT_OPEN',
        retryAfter: status.nextAttempt,
      });
    }

    const { type = 'tweet', topic, tone, message, plan, context = {} } = req.body;

    const brain = await getBrain();

    // Cargar traits si se proporcionan
    if (req.body.traits) {
      brain.loadTraits(req.body.traits);
    }

    let result;

    switch (type) {
      case 'tweet':
        if (!topic) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere topic para generar tweets',
          });
        }
        result = await brain.generateTweet({ topic, tone: tone || 'casual', context });
        break;

      case 'reply':
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere message para generar replies',
          });
        }
        // Usar plan proporcionado o uno por defecto
        const replyPlan = plan || { strategy: 'engage', tone: 'casual', length: 'medium' };
        result = await brain.responseGenerator.generateReply(message, replyPlan, context);
        break;

      case 'engagement':
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere message para generar engagement',
          });
        }
        const engagePlan = plan || { strategy: 'engage', tone: 'enthusiastic', length: 'short' };
        result = await brain.responseGenerator.generateEngagement(message, engagePlan, context);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Tipo no soportado: ${type}. Usa: tweet, reply, engagement`,
        });
    }

    // Marcar éxito en el circuit breaker
    llmBreaker.onSuccess();

    res.json({
      success: true,
      data: {
        content: result.content,
        type: result.type,
        metadata: result.metadata,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        charCount: result.content?.length || 0,
      },
    });

  } catch (error) {
    // Marcar fallo en el circuit breaker
    llmBreaker.onFailure();
    console.error('[BrainController] Error en generate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BRAIN_GENERATE_ERROR',
    });
  }
}

/**
 * POST /brain/analyze
 * Analiza un mensaje o perfil
 */
async function analyze(req, res) {
  try {
    const { message, type = 'message' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere message para analizar',
      });
    }

    const brain = await getBrain();

    // Usar quickFilter para análisis rápido
    const quickResult = await brain.quickFilter(message);

    // Si pasa el filtro rápido, hacer evaluación completa
    let fullEvaluation = null;
    if (quickResult.passedFilter) {
      const decision = await brain.decisionMaker.decide(message, {});
      fullEvaluation = decision.evaluation;
    }

    res.json({
      success: true,
      data: {
        quickFilter: {
          passed: quickResult.passedFilter,
          shouldRespond: quickResult.shouldRespond,
          reason: quickResult.reason,
        },
        evaluation: fullEvaluation,
        analysis: {
          contentLength: message.content?.length || 0,
          hasQuestion: /\?/.test(message.content || ''),
          hasMention: /@\w+/.test(message.content || ''),
          hasUrl: /https?:\/\//.test(message.content || ''),
          hasEmoji: /[\u{1F600}-\u{1F6FF}]/u.test(message.content || ''),
        },
      },
      meta: {
        analyzedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[BrainController] Error en analyze:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BRAIN_ANALYZE_ERROR',
    });
  }
}

/**
 * GET /brain/health
 * Estado de salud del cerebro
 */
async function health(req, res) {
  try {
    const isInitialized = brainInstance !== null && brainInstance.initialized;
    const breakerStatus = llmBreaker.getStatus();
    
    const healthData = {
      status: isInitialized ? 'healthy' : 'initializing',
      initialized: isInitialized,
      components: {
        decisionMaker: isInitialized && brainInstance.decisionMaker ? 'ready' : 'not_ready',
        responseGenerator: isInitialized && brainInstance.responseGenerator ? 'ready' : 'not_ready',
        memory: brainInstance?.memory ? 'connected' : 'not_configured',
        circuitBreaker: breakerStatus.state,
      },
      provider: brainInstance?.provider || 'groq',
      uptime: brainInstance?.stats?.startTime 
        ? Date.now() - new Date(brainInstance.stats.startTime).getTime()
        : 0,
      circuitBreaker: breakerStatus,
    };

    // Si el circuit breaker está abierto, marcar como degraded
    if (breakerStatus.state === 'OPEN') {
      healthData.status = 'degraded';
    }

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      success: healthData.status === 'healthy',
      data: healthData,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: { status: 'error', error: error.message },
    });
  }
}

/**
 * GET /brain/stats
 * Estadísticas de uso del cerebro
 */
async function stats(req, res) {
  try {
    if (!brainInstance) {
      return res.json({
        success: true,
        data: {
          message: 'Brain no inicializado aún',
          stats: null,
        },
      });
    }

    const brainStats = brainInstance.getStats();

    res.json({
      success: true,
      data: {
        brain: brainStats.brain,
        decisionMaker: brainStats.decisionMaker,
        responseGenerator: brainStats.responseGenerator,
        uptime: brainStats.uptime,
        uptimeFormatted: formatUptime(brainStats.uptime),
      },
    });

  } catch (error) {
    console.error('[BrainController] Error en stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /brain/traits
 * Cargar traits de personalidad
 */
async function loadTraits(req, res) {
  try {
    const { traits } = req.body;

    if (!traits) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere traits en el body',
      });
    }

    const brain = await getBrain();
    brain.loadTraits(traits);

    res.json({
      success: true,
      message: 'Traits cargados correctamente',
      data: {
        topics: traits.topics || [],
        toneKeys: Object.keys(traits.tone || {}),
      },
    });

  } catch (error) {
    console.error('[BrainController] Error en loadTraits:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /brain/reset
 * Resetear estadísticas del brain
 */
async function reset(req, res) {
  try {
    if (!brainInstance) {
      return res.json({
        success: true,
        message: 'Brain no estaba inicializado',
      });
    }

    brainInstance.reset();

    res.json({
      success: true,
      message: 'Brain reseteado correctamente',
    });

  } catch (error) {
    console.error('[BrainController] Error en reset:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// Helpers
function formatUptime(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

module.exports = {
  decide,
  generate,
  analyze,
  health,
  stats,
  loadTraits,
  reset,
  getBrain, // Exportar para tests
};
