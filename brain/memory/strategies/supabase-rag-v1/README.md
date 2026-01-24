# MemorySystem - Supabase RAG v1

> Sistema de memoria con Retrieval-Augmented Generation usando Supabase + pgvector

## 🎯 Propósito

Permite al bot **recordar** conversaciones e interacciones previas para dar respuestas contextuales.

## 📁 Estructura

```
supabase-rag-v1/
├── index.js          # Clase principal MemorySystem
├── store.js          # Guardar memorias en Supabase
├── retriever.js      # Buscar memorias relevantes
├── embedder.js       # Texto → Vector (embeddings)
├── schema.sql        # Tablas de Supabase
└── README.md         # Esta documentación
```

## 🔄 Flujo

```
GUARDAR:
  Texto → Embedder → Vector → Supabase (pgvector)

BUSCAR:
  Query → Embedder → Vector → Búsqueda similitud → Contexto relevante
```

## 🗄️ Schema de Base de Datos

```sql
-- Tabla de memorias
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(384),  -- Dimensión del modelo
  metadata JSONB,
  memory_type TEXT,       -- 'conversation', 'fact', 'preference'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida
CREATE INDEX ON memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 🧪 Uso

```javascript
const MemorySystem = require('./index');

const memory = new MemorySystem(supabaseClient, {
  embeddingModel: 'local', // o 'openai', 'cohere'
});

// Guardar
await memory.store({
  userId: 'user123',
  content: 'Me gusta la programación en Python',
  type: 'preference',
});

// Buscar contexto relevante
const context = await memory.retrieve({
  userId: 'user123',
  query: '¿Qué lenguaje de programación uso?',
  limit: 5,
});
// → Retorna memorias sobre programación
```

## ⚙️ Configuración

```bash
# .env
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."
```

## 📊 Tipos de Memoria

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `conversation` | Mensajes intercambiados | "Usuario preguntó sobre IA" |
| `fact` | Hechos aprendidos | "Usuario trabaja en Google" |
| `preference` | Preferencias | "Prefiere respuestas cortas" |
| `interaction` | Interacciones sociales | "Le dio like a post sobre ML" |

---

*Estrategia v1 - Enero 2026*
