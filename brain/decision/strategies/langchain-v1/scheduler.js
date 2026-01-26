/**
 * Scheduler - Controla el timing de las respuestas
 * 
 * NO usa LLM, solo reglas para:
 * - Parecer humano (delays variables)
 * - Respetar rate limits
 * - Optimizar engagement por horario
 * 
 * @usage
 * const scheduler = new Scheduler();
 * const timing = scheduler.getOptimalTiming(context);
 * await scheduler.wait(timing.delay);
 */

class Scheduler {
  constructor(options = {}) {
    // Configuración de delays
    this.config = {
      // Delay base antes de responder (ms)
      baseDelay: options.baseDelay || 5000, // 5 segundos
      
      // Variación aleatoria (±)
      jitterPercent: options.jitterPercent || 0.5, // ±50%
      
      // Delay mínimo y máximo
      minDelay: options.minDelay || 2000, // 2 segundos
      maxDelay: options.maxDelay || 30000, // 30 segundos
      
      // Rate limiting
      maxResponsesPerHour: options.maxResponsesPerHour || 20,
      maxResponsesPerDay: options.maxResponsesPerDay || 100,
      
      // Horarios de actividad (hora local)
      activeHours: options.activeHours || { start: 8, end: 23 },
    };

    // Tracking de respuestas
    this.responseHistory = [];
    this.lastResponseTime = null;
  }

  /**
   * Calcula el timing óptimo para responder
   * 
   * @param {Object} context - Contexto
   * @param {number} context.priority - Prioridad del mensaje (0-1)
   * @param {string} context.category - Categoría del mensaje
   * @returns {Object} Timing info
   */
  getOptimalTiming(context = {}) {
    const { priority = 0.5, category = 'mention' } = context;
    
    // 1. Calcular delay base
    let delay = this._calculateDelay(priority);
    
    // 2. Verificar rate limits
    const rateCheck = this._checkRateLimits();
    if (!rateCheck.canRespond) {
      return {
        canRespond: false,
        delay: 0,
        reason: rateCheck.reason,
        retryAfter: rateCheck.retryAfter,
      };
    }
    
    // 3. Verificar horario
    const hourCheck = this._checkActiveHours();
    if (!hourCheck.isActive) {
      return {
        canRespond: false,
        delay: 0,
        reason: `Fuera de horario activo (${this.config.activeHours.start}:00 - ${this.config.activeHours.end}:00)`,
        retryAfter: hourCheck.nextActiveTime,
      };
    }
    
    // 4. Ajustar por categoría
    if (category === 'question') {
      delay = Math.min(delay, 10000); // Preguntas: responder más rápido
    }
    
    // 5. Agregar jitter para parecer humano
    delay = this._addJitter(delay);
    
    return {
      canRespond: true,
      delay,
      reason: this._getDelayReason(delay),
      scheduledFor: new Date(Date.now() + delay),
    };
  }

  /**
   * Calcula delay base según prioridad
   * @private
   */
  _calculateDelay(priority) {
    // Mayor prioridad = menor delay
    const priorityFactor = 1 - priority; // 0 = muy urgente, 1 = puede esperar
    
    const range = this.config.maxDelay - this.config.minDelay;
    const delay = this.config.minDelay + (range * priorityFactor * 0.5);
    
    return Math.round(delay);
  }

  /**
   * Agrega variación aleatoria
   * @private
   */
  _addJitter(delay) {
    const jitterRange = delay * this.config.jitterPercent;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    
    const finalDelay = delay + jitter;
    
    // Asegurar que está en rango válido
    return Math.max(
      this.config.minDelay,
      Math.min(this.config.maxDelay, Math.round(finalDelay))
    );
  }

  /**
   * Verifica rate limits
   * @private
   */
  _checkRateLimits() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Limpiar historial antiguo
    this.responseHistory = this.responseHistory.filter(t => t > oneDayAgo);
    
    // Contar respuestas recientes
    const responsesLastHour = this.responseHistory.filter(t => t > oneHourAgo).length;
    const responsesLastDay = this.responseHistory.length;
    
    if (responsesLastHour >= this.config.maxResponsesPerHour) {
      const oldestInHour = this.responseHistory.find(t => t > oneHourAgo);
      const retryAfter = oldestInHour + (60 * 60 * 1000) - now;
      
      return {
        canRespond: false,
        reason: `Límite por hora alcanzado (${this.config.maxResponsesPerHour}/h)`,
        retryAfter,
      };
    }
    
    if (responsesLastDay >= this.config.maxResponsesPerDay) {
      const oldestInDay = this.responseHistory[0];
      const retryAfter = oldestInDay + (24 * 60 * 60 * 1000) - now;
      
      return {
        canRespond: false,
        reason: `Límite diario alcanzado (${this.config.maxResponsesPerDay}/día)`,
        retryAfter,
      };
    }
    
    return { canRespond: true };
  }

  /**
   * Verifica si estamos en horario activo
   * @private
   */
  _checkActiveHours() {
    const now = new Date();
    const currentHour = now.getHours();
    
    const { start, end } = this.config.activeHours;
    
    if (currentHour >= start && currentHour < end) {
      return { isActive: true };
    }
    
    // Calcular próximo horario activo
    let nextActiveTime;
    if (currentHour < start) {
      // Hoy más tarde
      nextActiveTime = new Date(now);
      nextActiveTime.setHours(start, 0, 0, 0);
    } else {
      // Mañana
      nextActiveTime = new Date(now);
      nextActiveTime.setDate(nextActiveTime.getDate() + 1);
      nextActiveTime.setHours(start, 0, 0, 0);
    }
    
    return {
      isActive: false,
      nextActiveTime: nextActiveTime.getTime() - now.getTime(),
    };
  }

  /**
   * Genera razón legible del delay
   * @private
   */
  _getDelayReason(delay) {
    if (delay < 5000) return 'Respuesta rápida (alta prioridad)';
    if (delay < 10000) return 'Timing normal';
    if (delay < 20000) return 'Esperando para parecer humano';
    return 'Delay extendido para naturalidad';
  }

  /**
   * Espera el tiempo especificado
   * 
   * @param {number} delay - Milisegundos a esperar
   * @returns {Promise<void>}
   */
  async wait(delay) {
    console.log(`[Scheduler] Esperando ${Math.round(delay / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Registra que se envió una respuesta
   */
  recordResponse() {
    this.responseHistory.push(Date.now());
    this.lastResponseTime = Date.now();
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      responsesLastHour: this.responseHistory.filter(t => t > oneHourAgo).length,
      responsesLastDay: this.responseHistory.filter(t => t > oneDayAgo).length,
      maxPerHour: this.config.maxResponsesPerHour,
      maxPerDay: this.config.maxResponsesPerDay,
      lastResponseTime: this.lastResponseTime,
    };
  }

  /**
   * Resetea el historial (para testing)
   */
  reset() {
    this.responseHistory = [];
    this.lastResponseTime = null;
  }
}

module.exports = { Scheduler };
