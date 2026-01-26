/**
 * Circuit Breaker Pattern - Patrón de resiliencia
 * 
 * Issue #10 - Integración Backend-Cerebro
 * 
 * Protege contra fallos en cascada cuando servicios externos (Groq, etc.)
 * están caídos o respondiendo lentamente.
 * 
 * Estados:
 * - CLOSED: Funcionamiento normal, las requests pasan
 * - OPEN: Servicio caído, las requests fallan inmediatamente
 * - HALF_OPEN: Probando si el servicio se recuperó
 * 
 * @example
 * const breaker = new CircuitBreaker({ name: 'groq-api' });
 * 
 * async function callGroq() {
 *   if (!breaker.canExecute()) {
 *     throw new Error('Servicio temporalmente no disponible');
 *   }
 *   try {
 *     const result = await groq.chat(...);
 *     breaker.onSuccess();
 *     return result;
 *   } catch (error) {
 *     breaker.onFailure();
 *     throw error;
 *   }
 * }
 */

const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker {
  /**
   * @param {Object} options - Configuración del circuit breaker
   * @param {string} options.name - Nombre identificador del circuito
   * @param {number} options.failureThreshold - Fallos antes de abrir (default: 5)
   * @param {number} options.successThreshold - Éxitos para cerrar desde half-open (default: 2)
   * @param {number} options.timeout - Tiempo en ms antes de probar de nuevo (default: 30000)
   */
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000; // 30 segundos

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    // Métricas
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      lastStateChange: new Date().toISOString(),
    };
  }

  /**
   * Verifica si se puede ejecutar una operación
   * @returns {boolean} true si el circuito permite la ejecución
   */
  canExecute() {
    this.stats.totalCalls++;

    if (this.state === STATES.CLOSED) {
      return true;
    }

    if (this.state === STATES.OPEN) {
      // Verificar si pasó el timeout para probar de nuevo
      if (Date.now() >= this.nextAttempt) {
        this._transitionTo(STATES.HALF_OPEN);
        return true;
      }
      this.stats.rejectedCalls++;
      return false;
    }

    // HALF_OPEN: permitir una request de prueba
    return true;
  }

  /**
   * Registra una operación exitosa
   */
  onSuccess() {
    this.stats.successfulCalls++;

    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this._transitionTo(STATES.CLOSED);
      }
    }

    // En estado CLOSED, resetear contador de fallos
    if (this.state === STATES.CLOSED) {
      this.failureCount = 0;
    }
  }

  /**
   * Registra una operación fallida
   */
  onFailure() {
    this.stats.failedCalls++;
    this.lastFailureTime = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      // Fallo durante prueba, volver a OPEN
      this._transitionTo(STATES.OPEN);
      return;
    }

    if (this.state === STATES.CLOSED) {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this._transitionTo(STATES.OPEN);
      }
    }
  }

  /**
   * Transición entre estados
   * @private
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stats.lastStateChange = new Date().toISOString();

    console.log(`[CircuitBreaker:${this.name}] ${oldState} → ${newState}`);

    if (newState === STATES.OPEN) {
      this.nextAttempt = Date.now() + this.timeout;
      this.successCount = 0;
    }

    if (newState === STATES.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttempt = null;
    }

    if (newState === STATES.HALF_OPEN) {
      this.successCount = 0;
    }
  }

  /**
   * Obtiene el estado actual del circuit breaker
   * @returns {Object} Estado y métricas
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt ? new Date(this.nextAttempt).toISOString() : null,
      config: {
        failureThreshold: this.failureThreshold,
        successThreshold: this.successThreshold,
        timeoutMs: this.timeout,
      },
      stats: this.stats,
    };
  }

  /**
   * Resetea el circuit breaker a estado inicial
   */
  reset() {
    this._transitionTo(STATES.CLOSED);
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      lastStateChange: new Date().toISOString(),
    };
    console.log(`[CircuitBreaker:${this.name}] Reset manual`);
  }

  /**
   * Verifica si el circuito está abierto (bloqueando requests)
   * @returns {boolean}
   */
  isOpen() {
    return this.state === STATES.OPEN && Date.now() < this.nextAttempt;
  }

  /**
   * Ejecuta una función con protección del circuit breaker
   * @param {Function} fn - Función async a ejecutar
   * @returns {Promise<any>} Resultado de la función
   * @throws {Error} Si el circuito está abierto o la función falla
   */
  async execute(fn) {
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker '${this.name}' is OPEN. Retry after ${new Date(this.nextAttempt).toISOString()}`);
      error.code = 'CIRCUIT_OPEN';
      error.retryAfter = this.nextAttempt;
      throw error;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}

// ============================================
// Singleton para circuit breakers globales
// ============================================

const breakers = new Map();

/**
 * Obtiene o crea un circuit breaker por nombre
 * @param {string} name - Nombre del servicio
 * @param {Object} options - Opciones de configuración
 * @returns {CircuitBreaker}
 */
function getCircuitBreaker(name, options = {}) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return breakers.get(name);
}

/**
 * Obtiene el estado de todos los circuit breakers
 * @returns {Object[]} Array con el estado de cada breaker
 */
function getAllBreakersStatus() {
  const status = [];
  for (const breaker of breakers.values()) {
    status.push(breaker.getStatus());
  }
  return status;
}

/**
 * Resetea todos los circuit breakers
 */
function resetAllBreakers() {
  for (const breaker of breakers.values()) {
    breaker.reset();
  }
}

module.exports = {
  CircuitBreaker,
  getCircuitBreaker,
  getAllBreakersStatus,
  resetAllBreakers,
  STATES,
};
