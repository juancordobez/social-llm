# 🏗️ Arquitectura de Social Mimic

> Documentación técnica de la arquitectura del sistema

## 📊 Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SOCIAL MIMIC                                     │
│                     AI-Powered Community Manager                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            🌐 CAPA DE ENTRADA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│   │   Twitter    │    │   LinkedIn   │    │  Instagram   │                   │
│   │   Adapter    │    │   Adapter    │    │   Adapter    │                   │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│          │                   │                   │                           │
│          └───────────────────┼───────────────────┘                           │
│                              ▼                                               │
│                    ┌─────────────────┐                                       │
│                    │  Social Events  │                                       │
│                    │     Queue       │                                       │
│                    └────────┬────────┘                                       │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ⚡ BACKEND (Node.js)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         API REST (Express)                           │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  /health    │  /api/v1/profiles  │  /api/v1/content  │  /api/v1/brain│   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│   ┌────────────┐    ┌─────────────┼─────────────┐    ┌────────────────┐     │
│   │  Circuit   │    │             ▼             │    │    Request     │     │
│   │  Breaker   │◄───┤      Brain Client         │    │   Validator    │     │
│   │  Pattern   │    │   (HTTP + Retry Logic)    │    │    (Zod)       │     │
│   └────────────┘    └───────────────────────────┘    └────────────────┘     │
│                                    │                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        Adapter Layer                                 │   │
│   ├─────────────┬─────────────┬─────────────┬───────────────────────────┤   │
│   │   Social    │   Database  │   Storage   │     LLM Adapters          │   │
│   │  Adapters   │   Adapter   │   Adapter   │   (Groq/OpenAI/Local)     │   │
│   └─────────────┴─────────────┴─────────────┴───────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🧠 BRAIN (Node.js)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Brain Orchestrator                              │   │
│   │                    (brain.js - Coordinador)                          │   │
│   └────────┬────────────────────┬────────────────────┬──────────────────┘   │
│            │                    │                    │                       │
│            ▼                    ▼                    ▼                       │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐             │
│   │  Personality   │   │    Memory      │   │   Decision     │             │
│   │    Engine      │   │    System      │   │    Maker       │             │
│   │   (Issue #7)   │   │   (Issue #8)   │   │   (Issue #9)   │             │
│   └────────┬───────┘   └────────┬───────┘   └────────┬───────┘             │
│            │                    │                    │                       │
│   ┌────────▼───────┐   ┌────────▼───────┐   ┌────────▼───────┐             │
│   │ trait-scoring  │   │ supabase-rag   │   │ langchain-v1   │             │
│   │      v1        │   │      v1        │   │  (LangChain)   │             │
│   │                │   │                │   │                │             │
│   │ • analyzer.js  │   │ • embedder.js  │   │ • evaluator.js │             │
│   │ • generator.js │   │ • store.js     │   │ • planner.js   │             │
│   │ • scorer.js    │   │ • retriever.js │   │ • scheduler.js │             │
│   │ • prompts.js   │   │ • schema.sql   │   │ • generator.js │             │
│   └────────────────┘   └────────────────┘   └────────────────┘             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ☁️ INFRAESTRUCTURA (GCP)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│   │  Cloud Run  │   │  Artifact   │   │   Secret    │   │  Cloud SQL  │     │
│   │  (Backend)  │   │  Registry   │   │  Manager    │   │ (PostgreSQL)│     │
│   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                                               │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│   │ Workload    │   │   Cloud     │   │    IAM      │   │  Pub/Sub    │     │
│   │  Identity   │   │  Storage    │   │  & Roles    │   │  (Futuro)   │     │
│   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Datos

### 1. Recepción de Eventos Sociales

```
Twitter API  ──►  Twitter Adapter  ──►  Normalized Event  ──►  Backend API
                         │
                         ▼
                  {
                    type: 'mention',
                    platform: 'twitter',
                    author: 'user123',
                    content: '...',
                    metadata: {...}
                  }
```

### 2. Procesamiento de Decisiones

```
Backend API
     │
     ▼
POST /api/v1/brain/process
     │
     ▼
┌─────────────────────────────────────────────────┐
│              Brain Orchestrator                  │
├─────────────────────────────────────────────────┤
│  1. Load Personality Traits                      │
│  2. Retrieve Relevant Memories (RAG)             │
│  3. Evaluate: ¿Debo responder?                   │
│  4. Plan: ¿Cómo responder?                       │
│  5. Schedule: ¿Cuándo responder?                 │
│  6. Generate: Contenido final                    │
└─────────────────────────────────────────────────┘
     │
     ▼
Response: {
  action: 'respond',
  content: 'Respuesta generada...',
  timing: { delay: 5000 },
  plan: { strategy: 'opinion', tone: 'casual' }
}
```

### 3. Publicación de Respuesta

```
Backend API
     │
     ▼
Twitter Adapter.postReply()
     │
     ▼
Twitter API ──► Tweet publicado
```

## 🧩 Componentes Principales

### Backend (`/backend`)

| Componente | Descripción | Tecnología |
|------------|-------------|------------|
| **API REST** | Endpoints HTTP | Express.js |
| **Brain Client** | Comunicación con Brain | Axios + Circuit Breaker |
| **Adapters** | Abstracciones de servicios | Patrón Adapter |
| **Validators** | Validación de requests | Zod |

### Brain (`/brain`)

| Componente | Descripción | Estrategia |
|------------|-------------|------------|
| **PersonalityEngine** | Análisis y generación de personalidad | `trait-scoring-v1` |
| **MemorySystem** | Almacenamiento y recuperación RAG | `supabase-rag-v1` |
| **DecisionMaker** | Evaluación, planificación y respuesta | `langchain-v1` |

### Infrastructure (`/infrastructure`)

| Componente | Descripción | Tecnología |
|------------|-------------|------------|
| **Terraform** | Infrastructure as Code | Terraform 1.5+ |
| **GitHub Actions** | CI/CD Pipelines | YAML Workflows |
| **Docker** | Containerización | Multi-stage builds |

## 🔌 Patrón de Adaptadores

El sistema utiliza el **Patrón Adapter** para abstraer servicios externos:

```javascript
// Interfaz común para todos los LLM
interface LLMAdapter {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON(prompt: string, schema: Schema): Promise<object>;
}

// Implementaciones intercambiables
class GroqAdapter implements LLMAdapter { ... }
class OpenAIAdapter implements LLMAdapter { ... }
class LocalLLMAdapter implements LLMAdapter { ... }

// Factory pattern para selección
const llm = createLLM({ provider: 'groq' }); // o 'openai', 'local'
```

## 🔐 Seguridad

### Gestión de Secrets

```
┌──────────────────┐     ┌──────────────────┐
│   GitHub Secrets │     │  GCP Secret Mgr  │
│                  │     │                  │
│ • GCP_PROJECT_ID │     │ • DATABASE_URL   │
│ • GCP_SA         │     │ • GROQ_API_KEY   │
│ • WORKLOAD_ID    │     │ • JWT_SECRET     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────────────────────────────┐
│            GitHub Actions                 │
│                                          │
│  1. Authenticate via Workload Identity   │
│  2. Fetch secrets from Secret Manager    │
│  3. Inject as environment variables      │
└──────────────────────────────────────────┘
```

### Autenticación GitHub → GCP

```
GitHub Actions  ──►  Workload Identity Provider  ──►  Service Account  ──►  GCP Resources
                            │
                            │  (Sin claves de servicio)
                            │  (Tokens de corta duración)
                            ▼
                     OIDC Token Exchange
```

## 🚀 Flujo de Despliegue

```
[Developer]
     │
     ├── Push to `dev` ─────► CI (tests, lint) ─────► ✅/❌
     │
     ├── PR to `stg` ────────► CI ────► Merge ────► CD Staging ────► Cloud Run (stg)
     │
     └── PR to `main` ───────► CI ────► Merge ────► CD Production ──► Cloud Run (prod)
                                                          │
                                                          └── Release Tag (v1.0.x)
```

## 📊 Escalabilidad

### Horizontal (Cloud Run)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloud Run                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Request  ──►  Load Balancer  ──►  ┌────────┐                  │
│                                     │ Pod 1  │                  │
│   Request  ──►  Load Balancer  ──►  ├────────┤  Auto-scaling    │
│                                     │ Pod 2  │  0 → N instancias│
│   Request  ──►  Load Balancer  ──►  ├────────┤                  │
│                                     │ Pod N  │                  │
│                                     └────────┘                  │
│                                                                  │
│   Configuración:                                                 │
│   • Min instances: 0 (staging) / 1 (production)                 │
│   • Max instances: 10 (staging) / 100 (production)              │
│   • CPU: 1 (staging) / 2 (production)                           │
│   • Memory: 512Mi (staging) / 1Gi (production)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Resiliencia (Circuit Breaker)

```
Normal State          Open State           Half-Open State
     │                    │                      │
     ▼                    ▼                      ▼
┌─────────┐         ┌─────────┐            ┌─────────┐
│ CLOSED  │─errors─►│  OPEN   │──timeout──►│ HALF    │
│         │         │         │            │ OPEN    │
│ Pasa    │         │ Falla   │            │ Prueba  │
│ todas   │◄─reset──│ rápido  │◄──fail─────│ 1 req   │
│ requests│         │         │            │         │
└─────────┘         └─────────┘            └─────────┘
                                                │
                                           success
                                                │
                                                ▼
                                          [CLOSED]
```

## 📁 Estructura de Directorios

```
social-llm/
├── 📁 backend/                 # API REST + Servicios
│   ├── api/                   # Rutas Express
│   ├── brain/                 # Cliente Brain + Circuit Breaker
│   ├── shared/                # Adapters, Utils
│   └── Dockerfile             # Imagen Docker
│
├── 📁 brain/                   # Cerebro IA
│   ├── strategies/            # Personalidad (trait-scoring-v1)
│   ├── memory/                # RAG (supabase-rag-v1)
│   ├── decision/              # Decisiones (langchain-v1)
│   └── brain.js               # Orquestador
│
├── 📁 infrastructure/          # IaC
│   └── terraform/             # Terraform modules
│
├── 📁 .github/                 # CI/CD
│   └── workflows/             # GitHub Actions
│
├── 📁 docs/                    # Documentación
│   ├── ARCHITECTURE.md        # Este archivo
│   ├── API_REFERENCE.md       # API docs
│   └── CI_CD_PIPELINE.md      # Guía CI/CD
│
└── 📁 shared/                  # Código compartido
    └── types/                 # TypeScript types
```

---

## 🔗 Referencias

- [PROJECT_BOARD.md](../PROJECT_BOARD.md) - Estado del proyecto
- [API_REFERENCE.md](./API_REFERENCE.md) - Documentación de API
- [CI_CD_PIPELINE.md](./CI_CD_PIPELINE.md) - Guía de CI/CD
- [Terraform README](../infrastructure/terraform/README.md) - IaC docs
