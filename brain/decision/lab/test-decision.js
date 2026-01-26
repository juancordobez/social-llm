/**
 * Test DecisionMaker - Prueba completa del sistema
 * 
 * Ejecutar: node brain/decision/lab/test-decision.js
 * 
 * NOTA: Requiere GROQ_API_KEY configurada en .env
 */

// Cargar variables de entorno
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const { DecisionMaker, Scheduler } = require('../strategies/langchain-v1');

// ========================================
// Mensajes de prueba
// ========================================

const TEST_MESSAGES = [
  {
    id: '1',
    author: 'developer_juan',
    content: '¿Qué opinas de TypeScript vs JavaScript para proyectos grandes?',
    isReply: false,
    mentions: ['social_mimic_bot'],
    expected: 'respond', // Pregunta técnica relevante
  },
  {
    id: '2',
    author: 'crypto_spam',
    content: 'FREE BITCOIN!!! Click here >>> bit.ly/scam Follow for follow $$$',
    isReply: false,
    mentions: [],
    expected: 'ignore', // Spam obvio
  },
  {
    id: '3',
    author: 'maria_tech',
    content: 'Acabo de terminar mi primer proyecto con React! 🎉',
    isReply: false,
    mentions: ['social_mimic_bot'],
    expected: 'respond', // Conversación amigable
  },
  {
    id: '4',
    author: 'troll_123',
    content: 'Los bots de IA son una basura y nunca serán como humanos',
    isReply: false,
    mentions: ['social_mimic_bot'],
    expected: 'ignore', // Provocación/troll
  },
  {
    id: '5',
    author: 'startup_founder',
    content: 'Estamos buscando feedback sobre nuestra app de productividad. ¿Alguien la ha probado?',
    isReply: false,
    mentions: [],
    expected: 'respond', // Oportunidad de engagement
  },
];

// ========================================
// Tests
// ========================================

async function testScheduler() {
  console.log('\n' + '═'.repeat(50));
  console.log('🕐 TEST: Scheduler (sin LLM)');
  console.log('═'.repeat(50));

  const scheduler = new Scheduler({
    baseDelay: 5000,
    maxResponsesPerHour: 5,
  });

  // Test timing normal
  const timing1 = scheduler.getOptimalTiming({ priority: 0.8 });
  console.log(`\n1. Alta prioridad (0.8):`);
  console.log(`   Puede responder: ${timing1.canRespond}`);
  console.log(`   Delay: ${timing1.delay}ms (${Math.round(timing1.delay/1000)}s)`);
  console.log(`   Razón: ${timing1.reason}`);

  const timing2 = scheduler.getOptimalTiming({ priority: 0.3 });
  console.log(`\n2. Baja prioridad (0.3):`);
  console.log(`   Delay: ${timing2.delay}ms (${Math.round(timing2.delay/1000)}s)`);

  // Simular rate limiting
  console.log('\n3. Simulando rate limit...');
  for (let i = 0; i < 5; i++) {
    scheduler.recordResponse();
  }
  
  const timing3 = scheduler.getOptimalTiming({ priority: 0.5 });
  console.log(`   Puede responder: ${timing3.canRespond}`);
  console.log(`   Razón: ${timing3.reason}`);

  console.log('\n✅ Scheduler OK');
}

async function testQuickFilter() {
  console.log('\n' + '═'.repeat(50));
  console.log('⚡ TEST: Quick Filter (sin LLM)');
  console.log('═'.repeat(50));

  // Necesitamos crear un evaluator para probar quickFilter
  // Como no tenemos modelo, solo probamos los casos que no necesitan LLM
  const { Evaluator } = require('../strategies/langchain-v1/evaluator');
  
  // Mock model (no se usará para quickFilter)
  const mockModel = {};
  const evaluator = new Evaluator(mockModel);

  const quickTests = [
    { content: 'Hi', author: 'test', expected: false, reason: 'Muy corto' },
    { content: '😀😀😀', author: 'test', expected: false, reason: 'Solo emojis' },
    { content: 'Follow back! F4F!!!', author: 'test', expected: false, reason: 'Spam' },
    { content: '¿Cómo puedo aprender Python?', author: 'test', expected: null, reason: 'Pasa al LLM' },
  ];

  for (const test of quickTests) {
    const result = evaluator.quickFilter(test);
    const passed = result?.shouldRespond === test.expected || 
                   (result === null && test.expected === null);
    
    console.log(`\n"${test.content.substring(0, 30)}..."`);
    console.log(`  Esperado: ${test.expected === null ? 'Pasa al LLM' : test.expected}`);
    console.log(`  Resultado: ${result === null ? 'Pasa al LLM' : result.shouldRespond}`);
    console.log(`  ${passed ? '✅' : '❌'} ${test.reason}`);
  }

  console.log('\n✅ Quick Filter OK');
}

async function testFullDecision() {
  console.log('\n' + '═'.repeat(50));
  console.log('🧠 TEST: DecisionMaker Completo (con LLM)');
  console.log('═'.repeat(50));

  // Verificar API key
  if (!process.env.GROQ_API_KEY) {
    console.log('\n⚠️  GROQ_API_KEY no configurada');
    console.log('   Saltando test con LLM...');
    console.log('   Configura tu .env para probar el flujo completo');
    return;
  }

  console.log('\n📡 Conectando a Groq...');
  
  const dm = new DecisionMaker({ provider: 'groq' });
  await dm.initialize();

  console.log('✅ Modelo cargado\n');

  // Probar cada mensaje
  for (const msg of TEST_MESSAGES) {
    console.log('─'.repeat(50));
    console.log(`📨 Mensaje de @${msg.author}:`);
    console.log(`   "${msg.content.substring(0, 60)}..."`);
    console.log(`   Esperado: ${msg.expected}`);

    try {
      const decision = await dm.decide(msg, {});
      
      const match = decision.action === msg.expected;
      console.log(`   Decisión: ${decision.action} ${match ? '✅' : '⚠️'}`);
      
      if (decision.evaluation) {
        console.log(`   Razón: ${decision.evaluation.reason}`);
        console.log(`   Confianza: ${decision.evaluation.confidence}`);
      }
      
      if (decision.plan) {
        console.log(`   Plan: ${decision.plan.strategy} / ${decision.plan.tone}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 1000));
  }

  // Mostrar stats
  console.log('\n' + '─'.repeat(50));
  console.log('📊 Estadísticas:');
  const stats = dm.getStats();
  console.log(`   Decisiones procesadas: ${stats.decisionsProcessed}`);
  console.log(`   Aprobadas: ${stats.responsesApproved}`);
  console.log(`   Rechazadas: ${stats.responsesRejected}`);
  console.log(`   Errores: ${stats.errors}`);
}

// ========================================
// Main
// ========================================

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     🧪 Test DecisionMaker - LangChain v1       ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Test 1: Scheduler (no necesita LLM)
    await testScheduler();

    // Test 2: Quick Filter (no necesita LLM)
    await testQuickFilter();

    // Test 3: Flujo completo (necesita LLM)
    await testFullDecision();

    console.log('\n' + '═'.repeat(50));
    console.log('✅ TODOS LOS TESTS COMPLETADOS');
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error en tests:', error);
    process.exit(1);
  }
}

main();
