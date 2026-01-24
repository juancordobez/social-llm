-- =============================================
-- MemorySystem Schema for Supabase
-- Social Mimic - RAG Memory Storage
-- =============================================

-- 1. Habilitar extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla principal de memorias
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  user_id TEXT NOT NULL,              -- ID del usuario/perfil
  platform TEXT DEFAULT 'twitter',    -- twitter, linkedin, etc
  
  -- Contenido
  content TEXT NOT NULL,              -- Texto de la memoria
  embedding VECTOR(384),              -- Vector de embeddings (all-MiniLM-L6-v2)
  
  -- Clasificación
  memory_type TEXT NOT NULL DEFAULT 'conversation',
  -- Tipos: 'conversation', 'fact', 'preference', 'interaction'
  
  -- Metadata flexible
  metadata JSONB DEFAULT '{}',
  -- Ejemplos:
  -- { "tweet_id": "123", "in_reply_to": "456" }
  -- { "topic": "tecnología", "sentiment": "positive" }
  
  -- Importancia y decaimiento
  importance FLOAT DEFAULT 0.5,       -- 0-1, qué tan importante
  access_count INTEGER DEFAULT 0,     -- Veces accedida
  last_accessed_at TIMESTAMPTZ,       -- Última vez usada
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para búsqueda eficiente

-- Índice de vectores para búsqueda semántica (coseno)
CREATE INDEX IF NOT EXISTS memories_embedding_idx 
ON memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice para filtrar por usuario
CREATE INDEX IF NOT EXISTS memories_user_id_idx 
ON memories (user_id);

-- Índice para filtrar por tipo
CREATE INDEX IF NOT EXISTS memories_type_idx 
ON memories (memory_type);

-- Índice compuesto usuario + fecha
CREATE INDEX IF NOT EXISTS memories_user_created_idx 
ON memories (user_id, created_at DESC);

-- 4. Función para buscar memorias similares
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding VECTOR(384),
  match_user_id TEXT,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  metadata JSONB,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.metadata,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM memories m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-actualizar updated_at
DROP TRIGGER IF EXISTS memories_updated_at ON memories;
CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. Tabla de conversaciones (agrupa memorias)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT DEFAULT 'twitter',
  external_id TEXT,                   -- ID del thread/conversación en la plataforma
  summary TEXT,                       -- Resumen generado
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS conversations_user_idx 
ON conversations (user_id);

-- 7. Relación memorias ↔ conversaciones
CREATE TABLE IF NOT EXISTS conversation_memories (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  position INTEGER,                   -- Orden en la conversación
  PRIMARY KEY (conversation_id, memory_id)
);

-- 8. Row Level Security (opcional, para multi-tenant)
-- ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access their memories" 
--   ON memories FOR ALL 
--   USING (user_id = current_user);

-- =============================================
-- Para ejecutar en Supabase:
-- 1. Ve a SQL Editor
-- 2. Pega este script completo
-- 3. Click "Run"
-- =============================================
