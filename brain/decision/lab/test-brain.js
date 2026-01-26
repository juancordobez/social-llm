/**
 * Test Brain - Flujo completo de decisión + generación
 * 
 * Ejecutar: node brain/decision/lab/test-brain.js
 * 
 * NOTA: Requiere GROQ_API_KEY configurada en .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const { Brain, createBrain } = require('../../brain');

// ========================================
// Mensajes de prueba
// ========================================

const TEST_MESSAGES = [
  {
    id: '1',
    author: 'dev_carlos',
    content: '¿Qué framework de JavaScript me recomiendas para un proyecto nuevo?',
    expected: 'respond',
    expectedStrategy: 'answer',
  },
  {
    id: '2',
    author: 'spam_bot',
    content: 'GANA DINERO DESDE CASA!!! Haz click >>> bit.ly/scam',
    expected: 'ignore',
  },
  {
    id: '3',
    author: 'junior_dev',
    content: 'Acabo de conseguir mi primer trabajo como programador! 🎉',
    expected: 'respond',
    expectedStrategy: 'engage',
  },
  {
    id: '4',
    author: 'angry_user',
    content: 'La IA es una estupidez y los bots son basura',
    expected: 'ignore',
  },
  {
    id: '5',
    author: 'curious_maria',
    content: '¿Crees que TypeScript es mejor que JavaScript?',
    expected: 'respond',
    expectedStrategy: 'opinion',
  },
];

// ========================================
// Traits de prueba
// ========================================

const TEST_TRAITS = {
  tone: {
    formality: 0.4,
    humor: 0.5,
    enthusiasm: 0.7,
    empathy: 0.8,
  },
  topics: ['programación', 'tecnología', 'JavaScript', 'startups'],
  vocabulary: ['genial', 'interesante', 'mira', 'vale'],
};

// ========================================
// Tests
// ========================================

async function testBrainInitialization() {
  console.log('\n' + '═'.repeat(50));
  console.log('🧠 TEST: Inicialización de Brain');
  console.log('═'.repeat(50));

  const brain = new Brain({ provider: 'groq' });
  
  console.log('Estado inicial:');
  console.log(`  Inicializado: ${brain.initialized}`);
  console.log(`  DecisionMaker: ${brain.decisionMaker ? '✓' : '✗'}`);
  console.log(`  ResponseGenerator: ${brain.responseGenerator ? '✓' : '✗'}`);

  await brain.initialize();

  console.log('\nDespués de initialize():');
  console.log(`  Inicializado: ${brain.initialized}`);
  console.log(`  DecisionMaker: ${brain.decisionMaker ? '✓' : '✗'}`);
  console.log(`  ResponseGenerator: ${brain.responseGenerator ? '✓' : '✗'}`);

  brain.loadTraits(TEST_TRAITS);
  console.log(`  Traits cargados: ${brain.traits ? '✓' : '✗'}`);

  console.log('\n✅ Inicialización OK');
  return brain;
}

async function testFullFlow(brain) {
  console.log('\n' + '═'.repeat(50));
  console.log('🔄 TEST: Flujo completo (Decisión + Generación)');
  console.log('═'.repeat(50));

  let correct = 0;
  let total = TEST_MESSAGES.length;

  for (const msg of TEST_MESSAGES) {
    console.log('\n' + '─'.repeat(50));
    console.log(`📨 @${msg.author}: "${msg.content.slice(0, 50)}..."`);
    console.log(`   Esperado: ${msg.expected}${msg.expectedStrategy ? ` (${msg.expectedStrategy})` : ''}`);

    const result = await brain.process(msg, {});

    const actionMatch = result.action === msg.expected;
    const strategyMatch = !msg.expectedStrategy || 
                         result.plan?.strategy === msg.expectedStrategy;

    if (actionMatch) correct++;

    // Mostrar resultado
    console.log(`   Resultado: ${result.action} ${actionMatch ? '✅' : '⚠️'}`);

    if (result.action === 'respond') {
      console.log(`   Plan: ${result.plan?.strategy} / ${result.plan?.tone}`);
      console.log(`   Respuesta: "${result.response?.slice(0, 100)}..."`);
      console.log(`   Longitud: ${result.response?.length} chars`);
    } else if (result.action === 'ignore') {
      console.log(`   Razón: ${result.reason?.slice(0, 80)}`);
    } else if (result.action === 'error') {
      console.log(`   Error: ${result.error}`);
    }

    // Pequeña pausa
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`📊 Resultados: ${correct}/${total} correctos (${Math.round(correct/total*100)}%)`);
}

async function testTweetGeneration(brain) {
  console.log('\n' + '═'.repeat(50));
  console.log('📝 TEST: Generación de Tweet Original');
  console.log('═'.repeat(50));

  const topics = [
    { topic: 'productividad para desarrolladores', tone: 'helpful' },
    { topic: 'el futuro de la IA', tone: 'curious' },
    { topic: 'errores comunes en JavaScript', tone: 'humorous' },
  ];

  for (const t of topics) {
    console.log(`\n📌 Tema: ${t.topic}`);
    console.log(`   Tono: ${t.tone}`);

    try {
      const result = await brain.generateTweet(t);
      
      console.log(`   Tweet: "${result.content}"`);
      console.log(`   Longitud: ${result.content.length} chars`);
      console.log(`   ${result.content.length <= 280 ? '✅' : '❌'} Dentro del límite`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }
}

async function showStats(brain) {
  console.log('\n' + '═'.repeat(50));
  console.log('📊 ESTADÍSTICAS FINALES');
  console.log('═'.repeat(50));

  const stats = brain.getStats();

  console.log('\nBrain:');
  console.log(`  Procesados: ${stats.brain.processed}`);
  console.log(`  Respondidos: ${stats.brain.responded}`);
  console.log(`  Ignorados: ${stats.brain.ignored}`);
  console.log(`  Errores: ${stats.brain.errors}`);

  console.log('\nDecisionMaker:');
  console.log(`  Decisiones: ${stats.decisionMaker.decisionsProcessed || 0}`);
  console.log(`  Aprobadas: ${stats.decisionMaker.responsesApproved || 0}`);
  console.log(`  Rechazadas: ${stats.decisionMaker.responsesRejected || 0}`);

  console.log('\nResponseGenerator:');
  console.log(`  Generados: ${stats.responseGenerator.generated || 0}`);
  console.log(`  Longitud promedio: ${stats.responseGenerator.avgLength || 0} chars`);
  console.log(`  Errores: ${stats.responseGenerator.errors || 0}`);
}

// ========================================
// Main
// ========================================

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║        🧪 Test Brain - Flujo Completo          ║');
  console.log('╚════════════════════════════════════════════════╝');

  // Verificar API key
  if (!process.env.GROQ_API_KEY) {
    console.log('\n⚠️  GROQ_API_KEY no configurada en .env');
    console.log('   Configura tu API key para ejecutar los tests');
    process.exit(1);
  }

  try {
    // Test 1: Inicialización
    const brain = await testBrainInitialization();

    // Test 2: Flujo completo
    await testFullFlow(brain);

    // Test 3: Generación de tweets
    await testTweetGeneration(brain);

    // Mostrar stats
    await showStats(brain);

    console.log('\n' + '═'.repeat(50));
    console.log('✅ TODOS LOS TESTS COMPLETADOS');
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error en tests:', error);
    process.exit(1);
  }
}

main();
