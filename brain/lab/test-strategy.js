/**
 * Brain Lab - Test Runner
 * 
 * Ejecuta pruebas de estrategias sin conectar a APIs reales.
 * 
 * Uso:
 *   node brain/lab/test-strategy.js trait-scoring-v1
 */

const { createMockLLM } = require('./mock-llm');

async function testStrategy(strategyName) {
  console.log(`\n🧪 Testing strategy: ${strategyName}\n`);
  console.log('='.repeat(50));

  try {
    // Cargar estrategia
    const Strategy = require(`../strategies/${strategyName}`);
    console.log('✅ Estrategia cargada');

    // Crear mock LLM
    const mockLLM = createMockLLM({ delay: 50 });
    console.log('✅ Mock LLM creado');

    // Crear engine con mock
    const engine = new Strategy.PersonalityEngine(mockLLM);
    console.log('✅ Engine instanciado');

    // Test 1: Aprender de samples
    console.log('\n📝 Test 1: learn()');
    const samplePosts = [
      '¡Me encanta programar! El código es poesía 🚀',
      'Nuevo proyecto en marcha, a ver qué sale...',
      'La IA está cambiando todo, hay que adaptarse.',
      'Compartiendo lo que aprendo cada día.',
    ];

    const traits = await engine.learn(samplePosts, { bio: 'Dev entusiasta' });
    console.log('   Traits aprendidos:', JSON.stringify(traits.tone, null, 2));
    console.log('   Confianza:', traits.confidence);

    // Test 2: Generar contenido
    console.log('\n📝 Test 2: generate()');
    const content = await engine.generate({
      type: 'post',
      topic: 'inteligencia artificial',
      platform: 'twitter',
    });
    console.log('   Contenido generado:', content);

    // Test 3: Evaluar contenido
    console.log('\n📝 Test 3: evaluate()');
    const score = await engine.evaluate(content);
    console.log('   Score:', score.overall);
    console.log('   Feedback:', score.feedback);

    // Test 4: Verificar autenticidad
    console.log('\n📝 Test 4: isAuthentic()');
    const isAuth = await engine.isAuthentic(content);
    console.log('   ¿Es auténtico?:', isAuth ? '✅ Sí' : '❌ No');

    // Stats del mock
    console.log('\n📊 Stats del Mock LLM:');
    console.log('   Llamadas:', mockLLM.getStats().callCount);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Todos los tests pasaron!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
const strategyArg = process.argv[2] || 'trait-scoring-v1';
testStrategy(strategyArg);
