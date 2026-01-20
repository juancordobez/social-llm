# SPRINT 01: FUNDAMENTOS TECNOLÓGICOS

## 🎯 OBJETIVO PRINCIPAL
Establecer la infraestructura base, arquitectura agnóstica y cerebro mínimo viable para comenzar el desarrollo iterativo de Social Mimic.

---

## 📊 CONTEXTO DEL PROYECTO

### **VISIÓN DEL PRODUCTO**
Social Mimic es un agente de IA que gestiona redes sociales como un community manager humano, capaz de:
- Generar contenido auténtico según la personalidad de la cuenta
- Interactuar naturalmente con usuarios (posts, comentarios, mensajes)
- Detectar y evitar otros bots para optimizar recursos
- Aprender continuamente del comportamiento y feedback

### **ARQUITECTURA OBJETIVO**
- **Serverless:** Google Cloud Functions para escalabilidad
- **Agnóstica:** Adaptadores para cambiar servicios sin reescribir código
- **Modular:** Separación clara entre cerebro (IA), backend (APIs) y frontend
- **Multi-cloud:** Capacidad de desplegar en GCP (primario), AWS o Azure

---

## 🏗️ DELIVERABLES DEL SPRINT

### **1. ESTRUCTURA DEL MONOREPO**
```
social-llm/
├── 📚 docs/                          # Documentación técnica
│   ├── ARCHITECTURE.md               # Arquitectura del sistema
│   ├── DEVELOPMENT_GUIDE.md          # Guía de desarrollo
│   ├── DEPLOYMENT_GUIDE.md           # Guía de despliegue
│   └── API_REFERENCE.md              # Documentación APIs
├── 🧠 brain/                         # Desarrollo del cerebro (ML/AI)
│   ├── notebooks/                    # Jupyter notebooks experimentales
│   ├── core/                         # Motor cognitivo base
│   │   ├── __init__.py
│   │   ├── personality_engine.py     # Análisis de personalidad
│   │   ├── memory_system.py          # Sistema RAG básico
│   │   └── decision_maker.py         # Lógica de decisiones
│   ├── adapters/                     # Adaptadores de modelos IA
│   │   ├── __init__.py
│   │   ├── groq_adapter.py           # Adaptador Groq API
│   │   ├── openai_adapter.py         # Adaptador OpenAI
│   │   └── base_adapter.py           # Interface base
│   ├── experiments/                  # Experimentos ML
│   ├── deployment/                   # Configs de modelo
│   ├── requirements.txt              # Dependencias Python
│   └── README.md                     # Documentación del brain
├── 🔧 backend/                       # Desarrollo de software
│   ├── api/                          # APIs REST principales
│   │   ├── auth/                     # Autenticación
│   │   ├── social/                   # APIs redes sociales
│   │   └── brain/                    # Interface con cerebro
│   ├── lambdas/                      # Funciones serverless
│   │   ├── content-generator/        # Generador de contenido
│   │   ├── social-interactions/      # Interacciones sociales
│   │   └── bot-detector/             # Detector de bots
│   ├── shared/                       # Código compartido
│   │   ├── adapters/                 # Adaptadores de servicios
│   │   ├── models/                   # Modelos de datos
│   │   └── utils/                    # Utilidades comunes
│   ├── infrastructure/               # IaC (Terraform)
│   ├── package.json                  # Dependencias Node.js
│   └── README.md                     # Documentación del backend
├── 🎨 frontend/                      # Web interface (futuro)
├── 📋 shared/                        # Configuraciones compartidas
│   ├── schemas/                      # Schemas de datos
│   ├── types/                        # Definiciones TypeScript
│   └── configs/                      # Configuraciones
├── 🐳 docker/                        # Containerización
│   ├── development/                  # Containers desarrollo
│   │   └── docker-compose.yml        # Servicios locales
│   └── production/                   # Containers producción
├── 🔄 .github/                       # GitHub workflows
│   ├── workflows/                    # CI/CD pipelines
│   │   ├── backend-ci.yml           # Tests backend
│   │   ├── brain-ci.yml             # Tests brain
│   │   └── deploy.yml               # Deployment
│   └── templates/                    # Templates de issues/PR
├── .gitignore                        # Git ignore rules
├── .env.example                      # Variables de entorno ejemplo
├── README.md                         # Documentación principal
└── PROJECT_BOARD.md                  # Estado y roadmap
```

### **2. STACK TECNOLÓGICO**

#### **DESARROLLO DEL CEREBRO (ML/AI)**
- **Plataforma:** Kaggle Notebooks (experimentación gratuita)
- **Lenguaje:** Python 3.11+
- **ML Framework:**
  - `transformers>=4.36.0` (HuggingFace)
  - `langchain>=0.1.0` (RAG system)
  - `sentence-transformers>=2.2.2` (embeddings)
- **Modelo Base:** Llama 3.1 70B (vía Groq API)
- **Vector DB:** Vertex AI Vector Search / Firestore

#### **DESARROLLO BACKEND**
- **Compute:** Google Cloud Functions Gen 2
- **Lenguajes:** 
  - Python 3.11 (funciones IA)
  - Node.js 20 (APIs sociales)
- **Frameworks:**
  - FastAPI (Python APIs)
  - Express.js (Node.js APIs - dev local)
  - Serverless Framework (deployment GCP)
- **Databases:**
  - Cloud SQL PostgreSQL - datos estructurados
  - Memorystore Redis - cache y sesiones
  - Firestore - documentos y vectores

#### **INFRAESTRUCTURA**
- **IaC:** Terraform + Serverless Framework
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Cloud Logging + Cloud Trace

### **3. ENTORNO DE DESARROLLO LOCAL**

#### **Docker Compose Setup**
```yaml
# docker/development/docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: social_mimic_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
      
  opensearch:
    image: opensearchproject/opensearch:2.11.0
    environment:
      - discovery.type=single-node
      - plugins.security.disabled=true
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=DevPassword123!
    ports:
      - "9200:9200"
      - "9600:9600"
    volumes:
      - opensearch_data:/usr/share/opensearch/data

volumes:
  postgres_data:
  opensearch_data:
```

#### **Variables de Entorno**
```env
# .env.example
# Database
DATABASE_URL="postgresql://dev:dev123@localhost:5432/social_mimic_dev"
REDIS_URL="redis://localhost:6379"

# AI Providers
GROQ_API_KEY="your_groq_api_key_here"
GROQ_MODEL="llama-3.1-70b-versatile"
OPENAI_API_KEY="your_openai_api_key_here"

# Social Media APIs
TWITTER_API_KEY="your_twitter_api_key"
TWITTER_API_SECRET="your_twitter_api_secret"
TWITTER_ACCESS_TOKEN="your_twitter_access_token"
TWITTER_ACCESS_TOKEN_SECRET="your_twitter_access_token_secret"

LINKEDIN_CLIENT_ID="your_linkedin_client_id"
LINKEDIN_CLIENT_SECRET="your_linkedin_client_secret"

# Google Cloud Configuration
GCP_PROJECT="your_gcp_project_id"
GCP_REGION="us-central1"
GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"

# Environment
NODE_ENV="development"
LOG_LEVEL="debug"
ENVIRONMENT="local"
```

### **4. CEREBRO BÁSICO OPERATIVO**

#### **Componentes Core**
```python
# brain/core/personality_engine.py
class PersonalityEngine:
    """
    Analiza perfil de usuario y extrae características de personalidad
    para generar contenido auténtico
    """
    
    def __init__(self, ai_adapter, vector_adapter):
        self.ai_adapter = ai_adapter
        self.vector_adapter = vector_adapter
    
    def analyze_profile(self, user_data):
        """Analiza datos del usuario y extrae traits de personalidad"""
        pass
    
    def generate_personality_prompt(self, personality_traits, context):
        """Genera prompt dinámico basado en personalidad"""
        pass
    
    def infer_behavior_patterns(self, historical_posts):
        """Infiere patrones de comportamiento del historial"""
        pass

# brain/core/memory_system.py  
class MemorySystem:
    """
    Sistema RAG para memoria de conversaciones y contexto relevante
    """
    
    def __init__(self, vector_adapter, database_adapter):
        self.vector_adapter = vector_adapter
        self.database_adapter = database_adapter
    
    def store_memory(self, content, metadata, memory_type="conversation"):
        """Almacena memoria con embeddings para búsqueda semántica"""
        pass
    
    def retrieve_relevant_context(self, query, limit=5, memory_types=None):
        """Recupera contexto relevante usando búsqueda vectorial"""
        pass
    
    def update_memory_importance(self, memory_id, importance_score):
        """Actualiza la importancia de una memoria"""
        pass

# brain/core/decision_maker.py
class DecisionMaker:
    """
    Motor de decisiones para acciones en redes sociales
    """
    
    def __init__(self, personality_engine, memory_system, ai_adapter):
        self.personality_engine = personality_engine
        self.memory_system = memory_system
        self.ai_adapter = ai_adapter
    
    def should_respond(self, post_context, user_personality):
        """Decide si responder a un post específico"""
        pass
    
    def generate_response(self, context, personality, response_type="comment"):
        """Genera respuesta apropiada según contexto y personalidad"""
        pass
    
    def plan_content_strategy(self, user_profile, engagement_data):
        """Planifica estrategia de contenido proactivo"""
        pass
```

#### **Adaptadores Agnósticos**
```python
# backend/shared/adapters/ai_adapter.py
from abc import ABC, abstractmethod

class BaseAIAdapter(ABC):
    """Interface base para adaptadores de IA"""
    
    @abstractmethod
    async def generate_text(self, prompt: str, max_tokens: int = 1000) -> str:
        pass
    
    @abstractmethod
    async def generate_embeddings(self, text: str) -> list[float]:
        pass

class GroqAdapter(BaseAIAdapter):
    """Adaptador para Groq API"""
    
    def __init__(self, api_key: str, model: str = "llama3-70b-8192"):
        self.api_key = api_key
        self.model = model
    
    async def generate_text(self, prompt: str, max_tokens: int = 1000) -> str:
        # Implementar llamada a Groq API
        pass
    
    async def generate_embeddings(self, text: str) -> list[float]:
        # Implementar generación de embeddings
        pass

# Factory pattern para crear adaptadores
class AIAdapterFactory:
    @staticmethod
    def create_adapter(provider_type: str, **kwargs) -> BaseAIAdapter:
        if provider_type == "groq":
            return GroqAdapter(**kwargs)
        elif provider_type == "openai":
            return OpenAIAdapter(**kwargs)
        else:
            raise ValueError(f"Unknown provider: {provider_type}")
```

### **5. PIPELINE CI/CD**

```yaml
# .github/workflows/main.yml
name: Social Mimic CI/CD

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run linting
        run: cd backend && npm run lint
      
      - name: Run tests
        run: cd backend && npm test
      
      - name: Build
        run: cd backend && npm run build

  test-brain:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: brain/requirements.txt
      
      - name: Install dependencies
        run: |
          cd brain
          pip install -r requirements.txt
      
      - name: Run linting
        run: |
          cd brain
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
          flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
      
      - name: Run tests
        run: cd brain && pytest -v

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'

  deploy-dev:
    if: github.ref == 'refs/heads/dev'
    needs: [test-backend, test-brain, security-scan]
    runs-on: ubuntu-latest
    environment: development
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy infrastructure
        run: |
          cd backend/infrastructure
          terraform init
          terraform plan -var-file="dev.tfvars"
          terraform apply -auto-approve -var-file="dev.tfvars"
      
      - name: Deploy Lambda functions
        run: |
          cd backend
          npm install
          npm run deploy:dev
```

---

## ⚙️ CONFIGURACIÓN DE DEPENDENCIAS

### **Backend (Node.js)**
```json
{
  "name": "social-mimic-backend",
  "version": "0.1.0",
  "description": "Backend APIs for Social Mimic AI agent",
  "main": "src/index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/ --ext .js,.ts",
    "lint:fix": "eslint src/ --ext .js,.ts --fix",
    "deploy:dev": "serverless deploy --stage dev",
    "deploy:prod": "serverless deploy --stage prod"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "aws-sdk": "^2.1500.0",
    "@aws-sdk/client-lambda": "^3.470.0",
    "@aws-sdk/client-s3": "^3.470.0",
    "prisma": "^5.7.1",
    "@prisma/client": "^5.7.1",
    "redis": "^4.6.0",
    "axios": "^1.6.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.3.2",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "supertest": "^6.3.3",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "serverless": "^3.38.0",
    "serverless-offline": "^13.3.0",
    "serverless-webpack": "^5.13.0"
  }
}
```

### **Brain (Python)**
```txt
# Dependencias core de ML/AI
transformers>=4.36.0
torch>=2.1.0
sentence-transformers>=2.2.2
langchain>=0.1.0
langchain-community>=0.0.10

# APIs de IA
openai>=1.6.0
groq>=0.4.1
anthropic>=0.8.0

# Base de datos y vectores
psycopg2-binary>=2.9.7
redis>=5.0.1
boto3>=1.34.0
opensearch-py>=2.4.0

# Utilidades
numpy>=1.24.0
pandas>=2.1.0
python-dotenv>=1.0.0
pydantic>=2.5.0
fastapi>=0.104.0
uvicorn>=0.24.0

# Testing y desarrollo
pytest>=7.4.0
pytest-asyncio>=0.21.0
black>=23.11.0
flake8>=6.1.0
isort>=5.12.0
jupyter>=1.0.0
ipykernel>=6.26.0

# Monitoreo y logs
structlog>=23.2.0
sentry-sdk>=1.38.0
```

---

## 📈 CRITERIOS DE ÉXITO

### **CRITERIOS TÉCNICOS**
- [ ] **Entorno local funcional:** `docker-compose up` inicia todos los servicios
- [ ] **Tests passing:** 100% de tests unitarios pasan en CI/CD
- [ ] **Linting limpio:** Sin errores de linting en backend y brain
- [ ] **Documentación completa:** README.md en cada módulo con instrucciones claras
- [ ] **CI/CD operativo:** Pipeline completo desde push hasta deploy

### **CRITERIOS FUNCIONALES**
- [ ] **API REST básica:** Endpoints de health check y configuración
- [ ] **Cerebro conectado:** Puede generar una respuesta simple usando Groq
- [ ] **Sistema RAG:** Puede almacenar y recuperar memoria básica
- [ ] **Adaptadores funcionando:** Cambiar entre Groq/OpenAI sin código
- [ ] **Deploy en AWS:** Funciones Lambda desplegadas y operativas

### **CRITERIOS DE CALIDAD**
- [ ] **Código limpio:** Siguiendo estándares PEP8 (Python) y ESLint (JS)
- [ ] **Seguridad básica:** Secrets en variables de entorno, no hardcoded
- [ ] **Monitoreo:** Logs estructurados y métricas básicas
- [ ] **Documentación:** Cada función/clase documentada
- [ ] **Escalabilidad:** Arquitectura preparada para múltiples usuarios

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### **FASE 1: ESTRUCTURA BASE (Días 1-2)**
1. **Crear estructura de carpetas completa**
   - Implementar toda la jerarquía del monorepo
   - Configurar .gitignore y archivos base
   
2. **Configurar gestión de dependencias**
   - package.json con scripts y dependencias
   - requirements.txt con librerías Python
   - Docker Compose para desarrollo local

3. **Setup herramientas de desarrollo**
   - Configurar linting (ESLint, Flake8)
   - Configurar formateo (Prettier, Black)
   - Setup VSCode settings

### **FASE 2: BACKEND FOUNDATION (Días 3-5)**
4. **Implementar adaptadores base**
   - BaseAIAdapter y implementaciones
   - BaseVectorAdapter y implementaciones  
   - Configuration management system

5. **Crear API REST básica**
   - Express.js server con middleware básico
   - Health check endpoints
   - Configuration endpoints
   - Error handling middleware

6. **Setup base de datos**
   - Prisma schema y migrations
   - Redis connection y utilities
   - OpenSearch client setup

### **FASE 3: CEREBRO FOUNDATION (Días 6-8)**
7. **Implementar PersonalityEngine**
   - Análisis básico de perfil de usuario
   - Generación de prompts dinámicos
   - Sistema de traits de personalidad

8. **Crear MemorySystem**
   - Almacenamiento en OpenSearch
   - Recuperación con búsqueda vectorial
   - Gestión de importancia de memorias

9. **Setup DecisionMaker**
   - Lógica de decisión básica
   - Integración con PersonalityEngine
   - Sistema de scoring de acciones

### **FASE 4: INTEGRACIÓN Y CI/CD (Días 9-10)**
10. **Conectar backend con cerebro**
    - API endpoints para interactuar con brain
    - Serialización de requests/responses
    - Error handling entre servicios

11. **Configurar pipeline CI/CD**
    - GitHub Actions workflows
    - Tests automatizados
    - Deploy automático a dev

12. **Setup infraestructura AWS**
    - Terraform para recursos base
    - Lambda functions deployment
    - Monitoring y alertas básicas

---

## 📚 DOCUMENTACIÓN TÉCNICA

Al finalizar el sprint, se debe haber creado:

1. **docs/ARCHITECTURE.md** - Diagramas y explicación de la arquitectura
2. **docs/DEVELOPMENT_GUIDE.md** - Guía para nuevos desarrolladores
3. **docs/DEPLOYMENT_GUIDE.md** - Instrucciones de despliegue
4. **docs/API_REFERENCE.md** - Documentación de APIs REST

---

## 🔄 PRÓXIMOS PASOS

Una vez completado este sprint, estaremos preparados para:

1. **Sprint 02: MVP Social** - Integración con Twitter/LinkedIn APIs
2. **Sprint 03: Cerebro Inteligente** - Sistema RAG avanzado y aprendizaje
3. **Sprint 04: Producción** - Monitoreo, escalabilidad y multi-tenant

---

## 👥 ROLES Y RESPONSABILIDADES

- **Product Owner:** Definir requisitos y prioridades
- **AI Architect:** Diseño del cerebro y sistemas de ML
- **Software Engineer:** Backend, APIs e infraestructura  
- **DevOps Engineer:** CI/CD, deployment y monitoreo
- **QA Engineer:** Testing, calidad y documentación

*Nota: En esta fase inicial, Juan Cordobez asume todos los roles con apoyo de los agentes especializados.*
