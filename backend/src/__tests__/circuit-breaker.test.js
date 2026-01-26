/**
 * Tests del Circuit Breaker
 */

const {
  CircuitBreaker,
  getCircuitBreaker,
  getAllBreakersStatus,
  resetAllBreakers,
  STATES,
} = require('../core/circuit-breaker');

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100, // 100ms para tests rápidos
    });
  });

  describe('Estado inicial', () => {
    test('inicia en estado CLOSED', () => {
      expect(breaker.state).toBe(STATES.CLOSED);
    });

    test('permite ejecución en estado CLOSED', () => {
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('Transición a OPEN', () => {
    test('abre después de alcanzar failureThreshold', () => {
      // Simular 3 fallos consecutivos
      breaker.onFailure();
      expect(breaker.state).toBe(STATES.CLOSED);
      
      breaker.onFailure();
      expect(breaker.state).toBe(STATES.CLOSED);
      
      breaker.onFailure();
      expect(breaker.state).toBe(STATES.OPEN);
    });

    test('rechaza requests cuando está OPEN', () => {
      // Forzar apertura
      for (let i = 0; i < 3; i++) {
        breaker.onFailure();
      }
      
      expect(breaker.canExecute()).toBe(false);
      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe('Transición a HALF_OPEN', () => {
    test('pasa a HALF_OPEN después del timeout', async () => {
      // Forzar apertura
      for (let i = 0; i < 3; i++) {
        breaker.onFailure();
      }
      expect(breaker.state).toBe(STATES.OPEN);
      
      // Esperar timeout
      await new Promise(r => setTimeout(r, 150));
      
      // Debería permitir un intento (transición a HALF_OPEN)
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.state).toBe(STATES.HALF_OPEN);
    });
  });

  describe('Recuperación (HALF_OPEN → CLOSED)', () => {
    test('cierra después de éxitos consecutivos en HALF_OPEN', async () => {
      // Forzar apertura
      for (let i = 0; i < 3; i++) {
        breaker.onFailure();
      }
      
      // Esperar timeout y activar HALF_OPEN
      await new Promise(r => setTimeout(r, 150));
      breaker.canExecute();
      
      // Simular éxitos
      breaker.onSuccess();
      expect(breaker.state).toBe(STATES.HALF_OPEN);
      
      breaker.onSuccess();
      expect(breaker.state).toBe(STATES.CLOSED);
    });

    test('vuelve a OPEN si falla durante HALF_OPEN', async () => {
      // Forzar apertura
      for (let i = 0; i < 3; i++) {
        breaker.onFailure();
      }
      
      // Esperar timeout y activar HALF_OPEN
      await new Promise(r => setTimeout(r, 150));
      breaker.canExecute();
      expect(breaker.state).toBe(STATES.HALF_OPEN);
      
      // Simular fallo durante HALF_OPEN
      breaker.onFailure();
      expect(breaker.state).toBe(STATES.OPEN);
    });
  });

  describe('Método execute()', () => {
    test('ejecuta función y registra éxito', async () => {
      const result = await breaker.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
      expect(breaker.stats.successfulCalls).toBe(1);
    });

    test('ejecuta función y registra fallo', async () => {
      await expect(
        breaker.execute(() => Promise.reject(new Error('fail')))
      ).rejects.toThrow('fail');
      
      expect(breaker.stats.failedCalls).toBe(1);
      expect(breaker.failureCount).toBe(1);
    });

    test('lanza error con código CIRCUIT_OPEN cuando está abierto', async () => {
      // Forzar apertura
      for (let i = 0; i < 3; i++) {
        breaker.onFailure();
      }
      
      try {
        await breaker.execute(() => Promise.resolve('ok'));
        fail('Debería haber lanzado error');
      } catch (error) {
        expect(error.code).toBe('CIRCUIT_OPEN');
        expect(error.retryAfter).toBeDefined();
      }
    });
  });

  describe('getStatus()', () => {
    test('retorna estado completo', () => {
      const status = breaker.getStatus();
      
      expect(status).toHaveProperty('name', 'test');
      expect(status).toHaveProperty('state', STATES.CLOSED);
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('stats');
      expect(status.config.failureThreshold).toBe(3);
    });
  });

  describe('reset()', () => {
    test('resetea a estado inicial', () => {
      // Generar algunos fallos
      breaker.onFailure();
      breaker.onFailure();
      
      breaker.reset();
      
      expect(breaker.state).toBe(STATES.CLOSED);
      expect(breaker.failureCount).toBe(0);
      expect(breaker.stats.totalCalls).toBe(0);
    });
  });
});

describe('Singleton Factory', () => {
  beforeEach(() => {
    resetAllBreakers();
  });

  test('getCircuitBreaker retorna mismo breaker por nombre', () => {
    const breaker1 = getCircuitBreaker('api');
    const breaker2 = getCircuitBreaker('api');
    
    expect(breaker1).toBe(breaker2);
  });

  test('diferentes nombres crean diferentes breakers', () => {
    const breaker1 = getCircuitBreaker('api1');
    const breaker2 = getCircuitBreaker('api2');
    
    expect(breaker1).not.toBe(breaker2);
  });

  test('getAllBreakersStatus retorna todos los estados', () => {
    getCircuitBreaker('service-a');
    getCircuitBreaker('service-b');
    
    const statuses = getAllBreakersStatus();
    
    expect(statuses.length).toBe(2);
    expect(statuses.map(s => s.name)).toContain('service-a');
    expect(statuses.map(s => s.name)).toContain('service-b');
  });

  test('resetAllBreakers resetea todos', () => {
    const breaker = getCircuitBreaker('test-reset');
    breaker.onFailure();
    breaker.onFailure();
    
    resetAllBreakers();
    
    expect(breaker.failureCount).toBe(0);
    expect(breaker.state).toBe(STATES.CLOSED);
  });
});
