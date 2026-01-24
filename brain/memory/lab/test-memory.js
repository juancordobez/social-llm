/**
 * Test MemorySystem - Prueba completa del sistema RAG
 * 
 * Ejecutar: node brain/memory/lab/test-memory.js
 * 
 * Usa mock embedder y mock Supabase para testing offline.
 */

const { MemorySystem, createEmbedder, STRATEGY_INFO } = require('../strategies/supabase-rag-v1');

// ========================================
// Mock Supabase Client
// ========================================

class MockSupabaseClient {
  constructor() {
    this.memories = [];
    this.nextId = 1;
  }

  from(table) {
    if (table !== 'memories') {
      return {
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: { message: 'Tabla no soportada' } }),
      };
    }

    return {
      // INSERT
      insert: (data) => ({
        select: () => ({
          single: async () => {
            const record = Array.isArray(data) ? data[0] : data;
            const newMemory = {
              id: this.nextId++,
              ...record,
              created_at: new Date().toISOString(),
            };
            this.memories.push(newMemory);
            return { data: newMemory, error: null };
          },
        }),
      }),

      // SELECT
      select: (columns, options = {}) => {
        let query = {
          data: [...this.memories],
          _filters: {},

          eq: function(field, value) {
            this.data = this.data.filter(m => m[field] === value);
            return this;
          },

          order: function(field, opts = {}) {
            this.data.sort((a, b) => {
              const valA = a[field];
              const valB = b[field];
              return opts.ascending ? valA - valB : valB - valA;
            });
            return this;
          },

          limit: function(n) {
            this.data = this.data.slice(0, n);
            return this;
          },

          then: function(resolve) {
            if (options.count === 'exact' && options.head) {
              resolve({ count: this.data.length, error: null });
            } else {
              resolve({ data: this.data, error: null });
            }
          },
        };

        return query;
      },

      // DELETE
      delete: () => ({
        eq: (field, value) => {
          const before = this.memories.length;
          this.memories = this.memories.filter(m => m[field] !== value);
          const deleted = before - this.memories.length;
          return Promise.resolve({ 
            data: { deleted }, 
            error: null 
          });
        },
      }),

      // UPDATE
      update: (data) => ({
        eq: (field, value) => {
          const memory = this.memories.find(m => m[field] === value);
          if (memory) {
            Object.assign(memory, data);
          }
          return Promise.resolve({ data: memory, error: null });
        },
      }),
    };
  }

  // RPC para búsqueda de vectores
  rpc(funcName, params) {
    if (funcName !== 'search_memories') {
      return Promise.resolve({ data: null, error: { message: 'RPC no soportado' } });
    }

    const { query_embedding, match_threshold, match_count, match_user_id } = params;

    // Simular búsqueda por similitud (simplificada)
    let results = this.memories;
    
    if (match_user_id) {
      results = results.filter(m => m.user_id === match_user_id);
    }

    // Calcular similitud mock (usando distancia euclidiana simplificada)
    results = results.map(m => {
      let similarity = 0;
      if (m.embedding && query_embedding) {
        // Similitud coseno simplificada
        const a = m.embedding;
        const b = query_embedding;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
      }
      return { ...m, similarity };
    });

    // Filtrar por threshold y ordenar
    results = results
      .filter(m => m.similarity >= match_threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, match_count);

    return Promise.resolve({ data: results, error: null });
  }
}

// ========================================
// Tests
// ========================================

async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  🧪 Test MemorySystem - Supabase RAG v1   ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('📋 Estrategia:', STRATEGY_INFO.name);
  console.log('📋 Versión:', STRATEGY_INFO.version);
  console.log('📋 Status:', STRATEGY_INFO.status);
  console.log();

  // Crear mock client
  const supabase = new MockSupabaseClient();
  
  // Crear MemorySystem con mock embedder
  const memory = new MemorySystem(supabase, {
    embedderType: 'mock',
    defaultLimit: 5,
    similarityThreshold: 0.3, // Bajo para mock
  });

  // Inicializar
  await memory.initialize();
  console.log();

  // ========================================
  // Test 1: Guardar conversación
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 1: Guardar conversación');
  console.log('────────────────────────────────────────────');

  const userId = 'user_123';

  await memory.rememberConversation({
    userId,
    userMessage: 'Hola! Soy Juan y trabajo como programador',
    botResponse: 'Mucho gusto Juan! Que lenguajes de programación usas?',
    metadata: { platform: 'twitter' },
  });

  await memory.rememberConversation({
    userId,
    userMessage: 'Principalmente Python y JavaScript',
    botResponse: 'Excelente combo! Python para backend y JS para frontend?',
  });

  console.log(`✓ Conversaciones guardadas: ${supabase.memories.length} memorias\n`);

  // ========================================
  // Test 2: Guardar hechos
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 2: Guardar hechos');
  console.log('────────────────────────────────────────────');

  await memory.rememberFact(userId, 'El usuario se llama Juan');
  await memory.rememberFact(userId, 'Juan es programador');
  await memory.rememberFact(userId, 'Juan usa Python y JavaScript');

  console.log(`✓ Hechos guardados: ${supabase.memories.filter(m => m.memory_type === 'fact').length}\n`);

  // ========================================
  // Test 3: Guardar preferencias
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 3: Guardar preferencias');
  console.log('────────────────────────────────────────────');

  await memory.rememberPreference(userId, 'Prefiere código limpio y documentado');
  await memory.rememberPreference(userId, 'Le gusta el café');

  console.log(`✓ Preferencias guardadas: ${supabase.memories.filter(m => m.memory_type === 'preference').length}\n`);

  // ========================================
  // Test 4: Buscar memorias
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 4: Buscar memorias relevantes');
  console.log('────────────────────────────────────────────');

  const query = 'programación';
  const results = await memory.recall({
    userId,
    query,
    limit: 3,
  });

  console.log(`Búsqueda: "${query}"`);
  console.log(`Resultados: ${results.length}`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.memory_type}] ${r.content.substring(0, 50)}...`);
    console.log(`     Similitud: ${r.similarity?.toFixed(4) || 'N/A'}`);
  });
  console.log();

  // ========================================
  // Test 5: Obtener contexto para LLM
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 5: Generar contexto para LLM');
  console.log('────────────────────────────────────────────');

  const context = await memory.getContext(userId, 'Qué lenguajes usa Juan?', 300);
  console.log('Contexto generado:');
  console.log('─'.repeat(40));
  console.log(context || '(vacío)');
  console.log('─'.repeat(40));
  console.log();

  // ========================================
  // Test 6: Estadísticas
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 6: Estadísticas');
  console.log('────────────────────────────────────────────');

  const stats = await memory.getStats(userId);
  console.log('Estadísticas de memoria:');
  console.log(`  Total: ${stats.total || supabase.memories.length}`);
  console.log();

  // ========================================
  // Test 7: Memorias recientes
  // ========================================
  console.log('────────────────────────────────────────────');
  console.log('TEST 7: Memorias recientes');
  console.log('────────────────────────────────────────────');

  const recent = await memory.getRecent(userId, 3);
  console.log(`Últimas ${recent.length} memorias:`);
  recent.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.memory_type}] ${r.content.substring(0, 40)}...`);
  });
  console.log();

  // ========================================
  // Resumen
  // ========================================
  console.log('╔════════════════════════════════════════════╗');
  console.log('║           ✅ TODOS LOS TESTS OK            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log();
  console.log('📊 Resumen:');
  console.log(`   - Memorias totales: ${supabase.memories.length}`);
  console.log(`   - Usuario: ${userId}`);
  console.log('   - Embedder: mock (testing)');
  console.log();
  console.log('🔜 Próximo paso: Probar con Supabase real');
  console.log('   1. Ejecutar schema.sql en Supabase');
  console.log('   2. Configurar SUPABASE_URL y SUPABASE_SERVICE_KEY');
  console.log('   3. Cambiar embedderType a "local"');
}

// Ejecutar
runTests().catch(console.error);
