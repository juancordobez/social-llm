# 🧠 Brain - Cerebro de Social Mimic

El cerebro del agente autónomo. Aquí vive la lógica de IA, estrategias de personalidad, memoria RAG, sistema de decisiones y el laboratorio de experimentación.

## 📁 Estructura

```
brain/
├── index.js                 # 📦 Exports principales
├── brain.js                 # 🎯 Orquestador central (Brain)
│
├── decision/                # 🤔 Sistema de decisiones (Issue #9)
│   ├── index.js             # Factory + exports
│   ├── strategies/
│   │   └── langchain-v1/    # Estrategia LangChain + Groq
│   │       ├── index.js     # DecisionMaker principal
│   │       ├── models.js    # Factory de LLMs (Groq/OpenAI/etc)
│   │       ├── prompts.js   # Templates ChatPromptTemplate
│   │       ├── schemas.js   # Validación Zod
│   │       ├── evaluator.js # ¿Debo responder? (LLM)
│   │       ├── planner.js   # ¿Cómo responder? (LLM)
│   │       ├── scheduler.js # Rate limiting (reglas)
│   │       └── response-generator.js # Generar contenido
│   └── lab/
│       ├── test-decision.js # Tests del DecisionMaker
│       └── test-brain.js    # Tests del Brain completo
│
├── strategies/              # 🎯 Estrategias de personalidad
│   └── trait-scoring-v1/    # Estrategia actual: métricas numéricas
│       ├── engine.js        # Clase principal PersonalityEngine
│       ├── analyzer.js      # Análisis de contenido → traits
│       ├── generator.js     # Generación de contenido
│       ├── scorer.js        # Evaluación de autenticidad
│       ├── prompts.js       # Templates de prompts
│       └── traits.js        # Schema de traits
│
├── memory/                  # 🧠 Sistema de memoria RAG (Issue #8)
│   ├── index.js             # Selector de estrategias
│   ├── strategies/
│   │   └── supabase-rag-v1/ # Estrategia RAG con pgvector
│   │       ├── embedder.js  # Texto → Vector (transformers.js)
│   │       ├── store.js     # Guardar memorias
│   │       ├── retriever.js # Buscar memorias relevantes
│   │       ├── schema.sql   # Schema SQL para Supabase
│   │       └── index.js     # Clase MemorySystem
│   └── lab/
│       ├── mock-embedder.js # Embedder para testing
│       └── test-memory.js   # Tests del sistema
│
├── lab/                     # 🧪 Laboratorio de pruebas
│   ├── mock-llm.js          # LLM simulado (no consume tokens)
│   └── test-strategy.js     # Runner de tests
│
├── core/                    # 📦 Código Python (referencia/futuro)
└── experiments/             # 📓 Experimentos y notebooks
```

## 🚀 Uso Rápido

### Brain (Orquestador Central)

```javascript
const { Brain, createBrain } = require('./brain');

// Crear e inicializar
const brain = await createBrain({ provider: 'groq' });

// Cargar personalidad
brain.loadTraits({
  tone: { formality: 0.4, humor: 0.5 },
  topics: ['tecnología', 'startups'],
});

// Procesar un mensaje (decide + genera respuesta)
const result = await brain.process({
  id: '123',
  author: 'usuario',
  content: '¿Qué opinas de TypeScript?',
}, context);

// result = {
//   action: 'respond',          // o 'ignore', 'delayed', 'error'
//   response: 'Me encanta...',  // Contenido generado
//   plan: { strategy: 'opinion', tone: 'casual', length: 'medium' },
//   timing: { delay: 5000, canRespond: true },
// }
```

### DecisionMaker (Solo Decisiones)

```javascript
const { createDecisionMaker } = require('./brain/decision');

const dm = await createDecisionMaker({ provider: 'groq' });

const decision = await dm.decide(message, context);
// { action: 'respond', evaluation: {...}, plan: {...}, timing: {...} }
```

### ResponseGenerator (Solo Generación)

```javascript
const { createResponseGenerator } = require('./brain/decision');

const rg = await createResponseGenerator({ provider: 'groq' });
rg.loadTraits(profileTraits);

const response = await rg.generateReply(message, plan, context);
// { content: '...', type: 'reply', plan: {...} }

const tweet = await rg.generateTweet({ topic: 'IA', tone: 'curious' });
// { content: '...', type: 'tweet' }
```

## 🧪 Probar el Sistema

```bash
# Test DecisionMaker (sin LLM y con LLM)
node brain/decision/lab/test-decision.js

# Test Brain completo (decisión + generación)
node brain/decision/lab/test-brain.js

# Test MemorySystem
node brain/memory/lab/test-memory.js

# Test PersonalityEngine con Mock LLM
node brain/lab/test-strategy.js trait-scoring-v1
```

## 🎯 Estrategias Disponibles

### Decisión: langchain-v1 (Actual) ✅
- **Enfoque:** LangChain + Groq para decisiones inteligentes
- **Componentes:** Evaluator (LLM) + Planner (LLM) + Scheduler (reglas)
- **Pros:** Portátil entre LLMs, validación Zod, rate limiting
- **Estado:** Producción

### Personalidad: trait-scoring-v1
- **Enfoque:** Reduce personalidad a números 0-1
- **Pros:** Simple, rápido, bajo consumo
- **Estado:** Experimental

### Memoria: supabase-rag-v1 ✅
- **Enfoque:** RAG con pgvector en Supabase
- **Pros:** $0/mes, búsqueda semántica, embeddings locales
- **Estado:** Producción

## 🔗 Integración con Twitter Bot

```javascript
// En twitter-bot.service.js
const { Brain } = require('../../../brain/brain');

// El bot usa Brain automáticamente
this.brain = new Brain({
  provider: 'groq',
  traits: this.config.botProfile.traits,
  memory: this.memory,
});
await this.brain.initialize();

// Procesar mención
const result = await this.brain.process(mention, context);
if (result.action === 'respond') {
  await this.twitter.reply(mention.id, result.response);
}
```

## 📊 Flujo de Procesamiento

```
Mención → Brain.process()
           ├─→ DecisionMaker.decide()
           │    ├─→ Evaluator: ¿Responder? (LLM)
           │    │    └─→ quickFilter: spam, muy corto, etc.
           │    ├─→ Planner: ¿Cómo? (estrategia, tono, longitud)
           │    └─→ Scheduler: ¿Cuándo? (rate limiting)
           │
           └─→ ResponseGenerator.generateReply()
                ├─→ Traits de personalidad
                ├─→ Contexto de memoria RAG
                └─→ Generar respuesta (LLM)
```

## ✅ Implementado (Issue #10)

- **Circuit Breaker**: Patrón de resiliencia para proteger contra fallos del LLM
  - Ubicación: `backend/src/core/circuit-breaker.js`
  - Integrado en: `backend/src/controllers/brain.controller.js`
  - Estados: CLOSED → OPEN → HALF_OPEN → CLOSED

## 📋 TODO / No Implementado

### Sistema de Colas para Operaciones Asíncronas

**Estado:** ❌ No implementado (decidido diferir a Sprint 02)

**¿Por qué no se implementó?**
- Añade complejidad significativa (Redis, workers, jobs)
- Para MVP con pocas interacciones, síncrono funciona bien
- Requiere infraestructura adicional

**Servicios de GCP recomendados para implementación futura:**

| Servicio | Uso | Costo |
|----------|-----|-------|
| **Cloud Tasks** | Colas de tareas con reintentos y scheduling | ~$0.40/millón de operaciones |
| **Cloud Pub/Sub** | Mensajería pub/sub para eventos | ~$40/TiB |
| **Cloud Run Jobs** | Trabajos batch en contenedores | Pay-per-use |

**Implementación futura sugerida:**
```javascript
// Ejemplo con Cloud Tasks (pseudocódigo)
const { CloudTasksClient } = require('@google-cloud/tasks');

app.post('/brain/decide', async (req, res) => {
  const taskId = await cloudTasks.createTask({
    queue: 'brain-queue',
    payload: { message: req.body.message },
    scheduleTime: Date.now() + 1000,
  });
  
  res.json({ 
    jobId: taskId, 
    status: 'queued',
    checkUrl: `/brain/jobs/${taskId}` 
  });
});
```

**Issue de seguimiento:** Crear issue en Sprint 02 para implementar colas si es necesario.
