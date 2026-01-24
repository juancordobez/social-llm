# 🧠 Brain - Cerebro de Social Mimic

El cerebro del agente autónomo. Aquí vive la lógica de IA, estrategias de personalidad, memoria RAG y el laboratorio de experimentación.

## 📁 Estructura

```
brain/
├── strategies/              # 🎯 Estrategias de personalidad (producción)
│   └── trait-scoring-v1/    # Estrategia actual: métricas numéricas
│       ├── engine.js        # Clase principal PersonalityEngine
│       ├── analyzer.js      # Análisis de contenido → traits
│       ├── generator.js     # Generación de contenido
│       ├── scorer.js        # Evaluación de autenticidad
│       ├── prompts.js       # Templates de prompts
│       └── traits.js        # Schema de traits
│
├── memory/                  # 🧠 Sistema de memoria RAG
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

## 🚀 Probar Estrategias (Sin API)

```bash
# Probar PersonalityEngine con Mock LLM
node brain/lab/test-strategy.js trait-scoring-v1

# Probar MemorySystem con Mock Supabase
node brain/memory/lab/test-memory.js
```

## 🎯 Estrategias Disponibles

### Personalidad: trait-scoring-v1 (Actual)
- **Enfoque:** Reduce personalidad a números 0-1
- **Pros:** Simple, rápido, bajo consumo
- **Contras:** Pierde matices
- **Estado:** Experimental

### Memoria: supabase-rag-v1 (Actual)
- **Enfoque:** RAG con pgvector en Supabase
- **Pros:** $0/mes, búsqueda semántica, embeddings locales
- **Contras:** Requiere setup de schema
- **Estado:** Experimental

### Planificadas
- `few-shot-v2`: Incluir posts reales como ejemplos
- `contextual-rag-v2`: RAG con reranking

## 🔗 Uso desde Backend

```javascript
// Personalidad
const PersonalityEngine = require('../../../brain/strategies/trait-scoring-v1');

// Memoria
const { createMemorySystem } = require('../../../brain/memory');
const memory = await createMemorySystem(supabaseClient, {
  embedderType: 'local', // o 'mock' para tests
});

// Recordar conversación
await memory.rememberConversation({
  userId: 'user_123',
  userMessage: 'Hola!',
  botResponse: 'Qué tal!',
});

// Obtener contexto para LLM
const context = await memory.getContext(userId, currentMessage);
```

## 🧪 Laboratorio

```javascript
const { createMockLLM } = require('./lab');

// LLM simulado - no gasta tokens
const mockLLM = createMockLLM();
const engine = new PersonalityEngine(mockLLM);

// Probar sin conectar a APIs
await engine.learn(posts);
await engine.generate({ topic: 'test' });
```

## 📋 Setup Supabase (Memory)

1. Crear proyecto en Supabase
2. Habilitar extensión pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Ejecutar `brain/memory/strategies/supabase-rag-v1/schema.sql`
4. Configurar variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
