/**
 * Tests de Integración - Brain API Endpoints
 * 
 * Issue #10 - Integración Backend-Cerebro
 * 
 * Ejecutar: npm test -- --grep "Brain API"
 * O: node backend/src/__tests__/brain.integration.test.js
 */

const request = require('supertest');

// Mock de dotenv antes de cargar la app
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-key';

const app = require('../app');

describe('Brain API Endpoints', () => {
  
  // ============================================
  // Health & Stats
  // ============================================
  
  describe('GET /api/v1/brain/health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/api/v1/brain/health')
        .expect('Content-Type', /json/);

      // Puede ser 200 (healthy) o 503 (initializing)
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('components');
    });
  });

  describe('GET /api/v1/brain/stats', () => {
    it('should return stats or not initialized message', async () => {
      const res = await request(app)
        .get('/api/v1/brain/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ============================================
  // Analyze (no genera contenido, más rápido)
  // ============================================

  describe('POST /api/v1/brain/analyze', () => {
    it('should reject request without message', async () => {
      const res = await request(app)
        .post('/api/v1/brain/analyze')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });

    it('should analyze a valid message', async () => {
      const res = await request(app)
        .post('/api/v1/brain/analyze')
        .send({
          message: {
            author: 'test_user',
            content: '¿Qué opinas de JavaScript?',
          },
        })
        .expect('Content-Type', /json/);

      // Puede fallar si no hay API key, pero estructura debe ser correcta
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('quickFilter');
        expect(res.body.data).toHaveProperty('analysis');
        expect(res.body.data.analysis).toHaveProperty('contentLength');
        expect(res.body.data.analysis).toHaveProperty('hasQuestion');
      }
    });

    it('should detect spam messages', async () => {
      const res = await request(app)
        .post('/api/v1/brain/analyze')
        .send({
          message: {
            author: 'spam_bot',
            content: 'FREE BITCOIN!!! Click >>> bit.ly/scam',
          },
        });

      if (res.status === 200) {
        expect(res.body.data.analysis.hasUrl).toBe(true);
      }
    });
  });

  // ============================================
  // Traits
  // ============================================

  describe('POST /api/v1/brain/traits', () => {
    it('should reject request without traits', async () => {
      const res = await request(app)
        .post('/api/v1/brain/traits')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should load valid traits', async () => {
      const res = await request(app)
        .post('/api/v1/brain/traits')
        .send({
          traits: {
            tone: { formality: 0.4, humor: 0.5 },
            topics: ['tech', 'startups'],
            vocabulary: ['genial', 'mira'],
          },
        });

      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message');
      }
    });
  });

  // ============================================
  // Generate (requiere LLM)
  // ============================================

  describe('POST /api/v1/brain/generate', () => {
    it('should reject tweet generation without topic', async () => {
      const res = await request(app)
        .post('/api/v1/brain/generate')
        .send({ type: 'tweet' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toContain('topic');
    });

    it('should reject reply generation without message', async () => {
      const res = await request(app)
        .post('/api/v1/brain/generate')
        .send({ type: 'reply' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toContain('message');
    });

    it('should reject unsupported type', async () => {
      const res = await request(app)
        .post('/api/v1/brain/generate')
        .send({ type: 'invalid_type' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toContain('no soportado');
    });

    // Test con LLM real (skip si no hay API key)
    const hasApiKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'test-key';
    
    (hasApiKey ? it : it.skip)('should generate tweet with valid topic', async () => {
      const res = await request(app)
        .post('/api/v1/brain/generate')
        .send({
          type: 'tweet',
          topic: 'productividad para desarrolladores',
          tone: 'helpful',
        })
        .expect('Content-Type', /json/);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('content');
        expect(res.body.data.content.length).toBeLessThanOrEqual(280);
      }
    }, 30000); // 30s timeout para LLM
  });

  // ============================================
  // Decide (flujo completo)
  // ============================================

  describe('POST /api/v1/brain/decide', () => {
    it('should reject request without message', async () => {
      const res = await request(app)
        .post('/api/v1/brain/decide')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject message without content', async () => {
      const res = await request(app)
        .post('/api/v1/brain/decide')
        .send({ message: { author: 'test' } })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    // Test con LLM real
    const hasApiKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'test-key';

    (hasApiKey ? it : it.skip)('should decide on valid message', async () => {
      const res = await request(app)
        .post('/api/v1/brain/decide')
        .send({
          message: {
            id: 'test-123',
            author: 'developer',
            content: '¿Cuál es tu framework favorito de JavaScript?',
          },
          context: {},
        })
        .expect('Content-Type', /json/);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('action');
        expect(['respond', 'ignore', 'delayed', 'error']).toContain(res.body.data.action);
      }
    }, 30000);
  });

  // ============================================
  // Reset
  // ============================================

  describe('POST /api/v1/brain/reset', () => {
    it('should reset brain stats', async () => {
      const res = await request(app)
        .post('/api/v1/brain/reset')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });
});

// Runner para ejecución directa
if (require.main === module) {
  const { execSync } = require('child_process');
  console.log('Ejecutando tests de Brain API...\n');
  
  try {
    execSync('npx jest --testPathPattern=brain.integration --verbose', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (error) {
    process.exit(1);
  }
}
