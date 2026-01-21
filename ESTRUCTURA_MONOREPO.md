# Social-LLM Project Structure

## ☁️ Stack B: $0/mes
- **Compute:** Google Cloud Functions (Free tier)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Cache:** Upstash Redis (Serverless)
- **AI/LLM:** Groq (Llama 3.1 70B)

## 📁 Estructura del Monorepo

```
social-llm/
├── 🧠 brain/                    # Núcleo de IA (Python)
│   ├── core/                    # Componentes principales
│   │   ├── __init__.py
│   │   ├── personality_engine.py ✅
│   │   ├── memory_system.py
│   │   └── decision_maker.py
│   ├── adapters/               # Adaptadores agnósticos
│   │   ├── __init__.py
│   │   ├── ai_adapter.py
│   │   ├── vector_adapter.py
│   │   └── social_adapter.py
│   ├── models/                 # Modelos de datos
│   │   ├── __init__.py
│   │   ├── profile.py
│   │   ├── content.py
│   │   └── interaction.py
│   ├── utils/                  # Utilidades
│   │   ├── __init__.py
│   │   ├── text_processor.py
│   │   └── validators.py
│   ├── tests/                  # Tests del brain
│   │   └── __init__.py
│   ├── requirements.txt        ✅
│   ├── setup.cfg              ✅
│   └── pyproject.toml         ✅
├── 🚀 backend/                 # APIs Serverless (Node.js)
│   ├── src/
│   │   ├── adapters/          # ⭐ Adaptadores Stack B
│   │   │   ├── index.js       ✅ Factory pattern
│   │   │   ├── base-ai.adapter.js       ✅ Interface AI
│   │   │   ├── groq.adapter.js          ✅ Groq (Llama 3.1)
│   │   │   ├── base-database.adapter.js ✅ Interface DB
│   │   │   ├── supabase.adapter.js      ✅ Supabase
│   │   │   ├── base-cache.adapter.js    ✅ Interface Cache
│   │   │   ├── upstash.adapter.js       ✅ Upstash Redis
│   │   │   └── twitter/       # 🐦 Módulo Twitter (híbrido)
│   │   │       ├── index.js   ✅ Punto de entrada
│   │   │       ├── config.js  ✅ Instancias Nitter + config
│   │   │       ├── parser.js  ✅ Parser HTML Nitter
│   │   │       ├── oauth.js   ✅ OAuth 1.0a
│   │   │       ├── scraper.js ✅ Lectura (Nitter) GRATIS
│   │   │       ├── api.js     ✅ Escritura (API) 1,500/mes
│   │   │       └── manager.js ✅ Orquestador
│   │   ├── core/              # 🧠 Lógica de negocio
│   │   │   ├── index.js       ✅
│   │   │   └── personality-engine.js ✅ Motor personalidad
│   │   ├── services/          # 🤖 Servicios
│   │   │   ├── index.js       ✅
│   │   │   └── twitter-bot.service.js ✅ Bot autónomo
│   │   ├── functions/         # Cloud Functions Handlers
│   │   │   ├── health.js      ✅ Health check
│   │   │   ├── profiles.js    ✅ CRUD perfiles
│   │   │   ├── content.js     ✅ Generación contenido
│   │   │   └── analytics.js   ✅ Métricas
│   │   ├── __tests__/         # Tests
│   │   │   └── adapters.test.js ✅
│   │   ├── functions.js       ✅ Entry point
│   │   ├── dev-server.js      ✅ Servidor desarrollo local
│   │   ├── config/            # Configuraciones
│   │   ├── controllers/       # (Legacy - referencia)
│   │   └── routes/            # (Legacy - referencia)
│   ├── scripts/               # 🎮 Scripts CLI
│   │   └── twitter-bot.js     ✅ CLI del bot Twitter
│   ├── prisma/
│   │   └── schema.prisma      ✅ Modelos de BD
│   ├── serverless.yml         ✅ Config GCP deploy
│   ├── package.json           ✅
│   ├── .eslintrc.json         ✅
│   └── .prettierrc            ✅
├── 🔗 shared/              # Código compartido
│   ├── types/              # Tipos y esquemas
│   │   └── __init__.py
│   ├── constants/          # Constantes globales
│   │   └── __init__.py
│   └── utils/              # Utilidades compartidas
│       └── __init__.py
├── 📋 docs/              # Documentación
│   ├── VISION_PRODUCTO.md ✅ Visión estratégica
│   ├── TWITTER_ADAPTER.md ✅ Doc módulo Twitter
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
├── 🏗️ infrastructure/     # IaC (Terraform)
│   ├── gcp/
│   └── (aws/, azure/ - removidos)
├── .vscode/              # Configuración VSCode
│   └── settings.json     ✅
├── .env.example          ✅
├── .gitignore           ✅
├── README.md            ✅
├── SPRINT_01_FUNDAMENTOS.md ✅
└── PROJECT_BOARD.md     ✅
```

## ✅ Progreso Issue #3

### ✅ Paso 1: Estructura de Directorios
- [x] Creación de todas las carpetas del monorepo
- [x] Organización por componentes (brain, backend, shared)
- [x] Separación clara de responsabilidades

### ✅ Paso 2: Archivos de Inicialización
- [x] `__init__.py` en todos los módulos Python
- [x] Configuración de importaciones base
- [x] Estructura modular establecida

### ✅ Paso 3: Herramientas de Linting
- [x] ESLint configurado para backend (Node.js/Express)
- [x] Prettier configurado para formateo de código
- [x] Flake8 y Black configurados para Python (brain)
- [x] Configuraciones en setup.cfg y pyproject.toml

### ✅ Paso 4: Configuración VSCode
- [x] Workspace multi-carpeta configurado
- [x] Configuraciones específicas por lenguaje
- [x] Extensiones recomendadas
- [x] Formateo automático al guardar
- [x] File nesting para mejor organización

## 🎯 Siguiente Fase
- **Issue #4**: Gestión de Dependencias
- **Issue #5**: Configuración de CI/CD
- **Issue #6**: Scripts de Desarrollo

## 🔧 Comandos de Validación

### Backend (Node.js)
```bash
cd backend
npm run lint      # ESLint check
npm run format    # Prettier format
```

### Brain (Python)
```bash
cd brain
flake8 .         # Linting check
black .          # Code formatting
```

---

## 🐦 Módulo Twitter (Nuevo)

Integración híbrida: **Lectura gratuita** (Nitter) + **Escritura API** (1,500/mes)

### Estructura
```
backend/src/adapters/twitter/
├── config.js   # Instancias Nitter, timeouts
├── parser.js   # Extraer tweets/perfiles del HTML
├── oauth.js    # Firmas OAuth 1.0a para API
├── scraper.js  # TwitterScraperAdapter (LECTURA)
├── api.js      # TwitterAPIAdapter (ESCRITURA)
├── manager.js  # TwitterManager (orquestador)
└── index.js    # Exporta todo
```

### Uso rápido
```javascript
const { TwitterManager } = require('./src/adapters');
const twitter = new TwitterManager();

// LEER (gratis via Nitter)
const tweets = await twitter.getUserTweets('elonmusk', 10);
const mentions = await twitter.getMentions();

// ESCRIBIR (API, cuenta del límite 1,500/mes)
await twitter.tweet('Hola mundo!');
await twitter.reply(tweetId, 'Gracias!');
```

### CLI de prueba
```bash
node backend/scripts/twitter-bot.js test           # Probar conexiones
node backend/scripts/twitter-bot.js mentions       # Ver menciones
node backend/scripts/twitter-bot.js start --dry    # Bot modo prueba
node backend/scripts/twitter-bot.js start          # Bot producción
```

📖 **Documentación completa:** [docs/TWITTER_ADAPTER.md](./docs/TWITTER_ADAPTER.md)
