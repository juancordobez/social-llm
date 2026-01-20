# Social-LLM Project Structure

## ☁️ Cloud Provider: Google Cloud Platform

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
│   │   ├── functions/         # ⭐ Cloud Functions Handlers
│   │   │   ├── health.js      ✅ Health check
│   │   │   ├── profiles.js    ✅ CRUD perfiles
│   │   │   ├── content.js     ✅ Generación contenido
│   │   │   └── analytics.js   ✅ Métricas
│   │   ├── functions.js       ✅ Entry point
│   │   ├── dev-server.js      ✅ Servidor desarrollo local
│   │   ├── config/            # Configuraciones
│   │   ├── controllers/       # (Legacy - referencia)
│   │   └── routes/            # (Legacy - referencia)
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
├── 🐳 docker/             # Configuración Docker
│   ├── development/       # Docker para desarrollo
│   │   └── docker-compose.yml ✅
│   └── production/        # Docker para producción
├── 📋 docs/              # Documentación
│   ├── architecture.md
│   ├── api.md
│   └── deployment.md
├── 🏗️ infrastructure/     # IaC (Terraform)
│   ├── aws/
│   ├── gcp/
│   └── azure/
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
