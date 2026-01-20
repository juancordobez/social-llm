# Social Mimic - Visión Completa del Producto

> **Documento de Visión Estratégica**  
> **Fecha:** 20 de enero de 2026  
> **Estado:** Aprobado por el CEO

---

## 🎯 Visión: Agente Social Autónomo

Social Mimic no es solo un generador de posts, es un **agente social completo** que simula ser humano.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOCIAL MIMIC - AGENTE COMPLETO               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎭 PERSONALIDAD (Input del cliente)                           │
│  └── Define quién ES el agente en cada red social              │
│                                                                 │
│  📝 CREAR CONTENIDO                                            │
│  └── Posts, stories, threads, artículos                        │
│                                                                 │
│  🔍 IDENTIFICAR PERFILES                                       │
│  └── Encontrar potenciales seguidores/clientes                 │
│  └── Analizar perfiles relevantes                              │
│                                                                 │
│  💬 CHATEAR                                                    │
│  └── DMs con seguidores                                        │
│  └── Responder consultas                                       │
│  └── Nutrir relaciones                                         │
│                                                                 │
│  💰 VENDER                                                     │
│  └── Identificar oportunidades                                 │
│  └── Conversaciones de venta                                   │
│  └── Seguimiento                                               │
│                                                                 │
│  💭 COMENTAR                                                   │
│  └── En posts de otros                                         │
│  └── Engagement estratégico                                    │
│  └── Construir presencia                                       │
│                                                                 │
│  👁️ TODO ES OBSERVABLE                                         │
│  └── Cada acción queda registrada en la red social             │
│  └── = Dataset automático para entrenamiento                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💎 Estrategia de Valor: Modelo Propio

### Roadmap hacia el modelo propio

```
┌─────────────────────────────────────────────────────────────┐
│                    ROADMAP DE VALOR                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FASE 1: ADQUISICIÓN (Ahora - Sprint 01-03)                │
│  └── Groq + Llama 3.1 → Servicio funcionando               │
│      └── 📊 Recopilar datos de interacciones               │
│      └── 📊 Guardar perfiles de personalidad               │
│      └── 📊 Almacenar contenido generado + feedback        │
│                                                             │
│  FASE 2: DATASET (6-12 meses)                              │
│  └── Miles de ejemplos de:                                 │
│      └── Prompt → Contenido → Engagement                   │
│      └── Personalidad → Estilo → Métricas                  │
│      └── Contexto → Decisión → Resultado                   │
│                                                             │
│  FASE 3: MODELO PROPIO (12-18 meses)                       │
│  └── Fine-tune con TUS datos únicos                        │
│      └── 🏆 Modelo especializado en "Social Mimic"         │
│      └── 🏆 Ventaja competitiva REAL                       │
│      └── 🏆 IP valiosa (el modelo ES el producto)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ¿Por qué esto es valioso?

| Competidor con GPT/Claude | Social Mimic con modelo propio |
|---------------------------|--------------------------------|
| Mismo modelo que todos | Modelo único entrenado con datos reales |
| Depende de OpenAI/Anthropic | Independiente, puedes hostear donde quieras |
| Costo por API siempre | Costo fijo de hosting |
| Sin diferenciación técnica | **IP defensible** |

---

## 📊 Fuentes de Datos para Entrenamiento

```
┌─────────────────────────────────────────────────────────────┐
│                 DATOS DISPONIBLES                           │
├──────────────────┬──────────────────────────────────────────┤
│ FUENTE           │ DATOS                                    │
├──────────────────┼──────────────────────────────────────────┤
│ 🎭 Cliente       │ • Personalidad definida (tone, style)    │
│   (Input manual) │ • Objetivos de negocio                   │
│                  │ • Productos/servicios a vender           │
│                  │ • Temas de expertise                     │
├──────────────────┼──────────────────────────────────────────┤
│ 📱 Redes Sociales│ • Posts publicados + engagement          │
│   (Automático)   │ • Comentarios hechos + respuestas        │
│                  │ • DMs enviados/recibidos                 │
│                  │ • Perfiles visitados/seguidos            │
│                  │ • Métricas (likes, shares, impressions)  │
├──────────────────┼──────────────────────────────────────────┤
│ 🤖 Agente        │ • Decisiones tomadas (por qué comentó X) │
│   (Interno)      │ • Contexto usado (memoria RAG)           │
│                  │ • Modelo/prompt usado                    │
│                  │ • Confianza en la decisión               │
└──────────────────┴──────────────────────────────────────────┘
```

---

## 🗄️ Modelo de Datos Completo (Sprint 02+)

```
┌─────────────────────────────────────────────────────────────┐
│                    ESQUEMA DE DATOS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  users                    # Clientes de Social Mimic        │
│  └── id, email, plan                                        │
│                                                             │
│  social_profiles          # Perfiles en redes sociales      │
│  └── user_id, platform, username, credentials               │
│                                                             │
│  personalities            # Personalidades definidas        │
│  └── profile_id, tone, style, topics, objectives, context   │
│                                                             │
│  ─────────────── ACCIONES DEL AGENTE ───────────────────   │
│                                                             │
│  agent_actions            # TODA acción del agente          │
│  └── id, profile_id, action_type, timestamp                 │
│  └── input_context        # Qué sabía el agente             │
│  └── decision_reasoning   # Por qué tomó esa decisión       │
│  └── output_content       # Qué generó                      │
│  └── platform_response    # ID en la red social             │
│                                                             │
│  action_types:                                              │
│  └── CREATE_POST, COMMENT, REPLY_DM, SEND_DM,              │
│  └── FOLLOW, LIKE, SHARE, IDENTIFY_LEAD, SALES_MESSAGE     │
│                                                             │
│  ─────────────── FEEDBACK DE REDES ─────────────────────   │
│                                                             │
│  engagement_metrics       # Métricas de cada acción         │
│  └── action_id, likes, comments, shares, impressions        │
│  └── replies, click_rate, conversion                        │
│  └── fetched_at           # Cuándo se actualizó             │
│                                                             │
│  conversations            # Historial de chats              │
│  └── profile_id, external_user_id, platform                 │
│  └── messages[], outcome (sale, follow, ignored)            │
│                                                             │
│  identified_leads         # Perfiles identificados          │
│  └── profile_id, external_user_id, platform                 │
│  └── relevance_score, interaction_history                   │
│                                                             │
│  ─────────────── PARA ENTRENAMIENTO ────────────────────   │
│                                                             │
│  training_examples        # Datos listos para fine-tune     │
│  └── input (personality + context + task)                   │
│  └── output (lo que generó)                                 │
│  └── quality_score (engagement + feedback)                  │
│  └── exported (si ya se usó para entrenar)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

```
Cliente configura personalidad
         │
         ▼
┌─────────────────┐
│   AGENT BRAIN   │──────────────────────────────────┐
│                 │                                   │
│  • Decide qué   │     Cada decisión se guarda      │
│    hacer        │◄────en agent_actions             │
│  • Genera       │                                   │
│    contenido    │                                   │
└────────┬────────┘                                   │
         │                                            │
         ▼                                            │
┌─────────────────┐                                   │
│  SOCIAL MEDIA   │                                   │
│    ADAPTERS     │                                   │
│                 │     Ejecuta en Twitter,           │
│  • Publica      │     LinkedIn, Instagram...        │
│  • Comenta      │                                   │
│  • Envía DMs    │                                   │
└────────┬────────┘                                   │
         │                                            │
         ▼                                            │
┌─────────────────┐                                   │
│  FEEDBACK LOOP  │                                   │
│                 │     Cada X horas recopila         │
│  • Métricas     │     engagement y actualiza        │
│  • Respuestas   │     training_examples             │
│  • Conversiones │                                   │
└────────┬────────┘                                   │
         │                                            │
         ▼                                            │
┌─────────────────┐                                   │
│ TRAINING DATA   │◄──────────────────────────────────┘
│                 │
│  Dataset para   │     Cuando tengas suficientes
│  modelo propio  │     datos: FINE-TUNE
└─────────────────┘
```

---

## 📅 Roadmap por Sprints

### Sprint 01: Fundamentos (Actual)
- ✅ Estructura del monorepo
- ✅ Gestión de dependencias  
- ✅ Adapters base (Groq, Supabase, Upstash)
- ✅ API REST base (Cloud Functions)
- 🔄 PersonalityEngine básico
- 📋 MemorySystem RAG
- 📋 DecisionMaker

### Sprint 02: Agente Social (Futuro)
- 📋 Schema completo de datos
- 📋 DataCollector service
- 📋 Social Media Adapters (Twitter, LinkedIn API)
- 📋 Sistema de acciones del agente
- 📋 Feedback loop (cron para métricas)

### Sprint 03: Interacciones (Futuro)
- 📋 Sistema de conversaciones (DMs)
- 📋 Identificación de leads
- 📋 Comentarios estratégicos
- 📋 Sistema de ventas

### Sprint 04+: Modelo Propio (Futuro)
- 📋 Exportador de training data
- 📋 Pipeline de fine-tuning
- 📋 Evaluación de modelo propio
- 📋 Migración gradual

---

## 💰 Stack Técnico ($0/mes en desarrollo)

```
┌────────────────────────────────────────┐
│         STACK B - $0/MES              │
├────────────────────────────────────────┤
│  🧠 AI:      Groq (Llama 3.1 70B)     │
│              6,000 requests/día FREE   │
│                                        │
│  🗄️ DB:     Supabase                  │
│              500MB PostgreSQL FREE     │
│              + pgvector para RAG       │
│                                        │
│  📦 Cache:  Upstash Redis             │
│              10,000 commands/día FREE  │
│                                        │
│  ⚡ Compute: GCP Cloud Functions       │
│              2M invocaciones/mes FREE  │
└────────────────────────────────────────┘
```

---

## ✅ Principios de Diseño

1. **Todo es observable:** Cada acción del agente se registra
2. **Datos para el futuro:** Diseñamos pensando en el fine-tuning
3. **Agnóstico de proveedor:** Podemos cambiar servicios sin reescribir
4. **Costo mínimo:** $0 en desarrollo, escala gradual en producción
5. **Human-in-the-loop:** El cliente siempre tiene la última palabra

---

*Este documento representa la visión aprobada del producto Social Mimic.*
