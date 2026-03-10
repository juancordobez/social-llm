# 🤝 Guía de Contribución - Social Mimic

¡Gracias por tu interés en contribuir a Social Mimic! Este documento te guiará en el proceso.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Estándares de Código](#estándares-de-código)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## 📜 Código de Conducta

Este proyecto sigue un código de conducta basado en el respeto y la colaboración:

- **Sé respetuoso** con otros contribuidores
- **Acepta críticas constructivas** con gracia
- **Enfócate en lo mejor** para la comunidad
- **Muestra empatía** hacia otros miembros

---

## 🚀 Cómo Contribuir

### Reportar Bugs

1. Verifica que el bug no haya sido reportado en [Issues](https://github.com/juancordobez/social-llm/issues)
2. Crea una nueva issue usando la plantilla de Bug Report
3. Incluye:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica
   - Entorno (OS, Node version, etc.)

### Sugerir Features

1. Verifica que no exista una sugerencia similar
2. Crea una issue con la etiqueta `enhancement`
3. Describe:
   - El problema que resuelve
   - La solución propuesta
   - Alternativas consideradas

### Contribuir Código

1. Fork el repositorio
2. Crea una rama desde `dev`
3. Implementa tus cambios
4. Asegúrate de que los tests pasen
5. Crea un Pull Request hacia `dev`

---

## ⚙️ Configuración del Entorno

### Prerrequisitos

```bash
# Versiones mínimas requeridas
Node.js 20+
Python 3.11+ (opcional, para brain/core)
Docker + Docker Compose
Git
```

### Setup Inicial

```bash
# 1. Clonar tu fork
git clone https://github.com/TU_USUARIO/social-llm.git
cd social-llm

# 2. Agregar upstream
git remote add upstream https://github.com/juancordobez/social-llm.git

# 3. Instalar dependencias
npm install

# 4. Copiar variables de entorno
cp .env.example .env

# 5. Configurar tu API key de Groq (opcional para desarrollo)
# Edita .env y agrega GROQ_API_KEY=tu_key

# 6. Verificar instalación
npm run lint
npm test
```

### Ejecutar en Desarrollo

```bash
# Iniciar backend + brain en modo desarrollo
npm run dev

# Solo backend
cd backend && npm run dev

# Solo tests en modo watch
npm run test:watch
```

---

## 🔄 Flujo de Trabajo

### Branching Strategy

```
main (producción)
  │
  └── stg (staging)
       │
       └── dev (desarrollo)
            │
            ├── feature/nueva-funcionalidad
            ├── fix/correccion-bug
            └── docs/documentacion
```

### Convención de Nombres de Ramas

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Feature | `feature/descripcion-corta` | `feature/twitter-adapter` |
| Bug Fix | `fix/descripcion-bug` | `fix/circuit-breaker-timeout` |
| Docs | `docs/descripcion` | `docs/api-reference` |
| Refactor | `refactor/descripcion` | `refactor/memory-system` |

### Proceso de Contribución

```bash
# 1. Sincronizar con upstream
git checkout dev
git fetch upstream
git rebase upstream/dev

# 2. Crear rama de trabajo
git checkout -b feature/mi-feature

# 3. Hacer commits (ver convención abajo)
git commit -m "feat(brain): add new decision strategy"

# 4. Push a tu fork
git push origin feature/mi-feature

# 5. Crear Pull Request hacia dev
```

---

## 📝 Estándares de Código

### JavaScript/TypeScript

Usamos ESLint + Prettier para mantener consistencia:

```bash
# Verificar linting
npm run lint

# Corregir automáticamente
npm run lint:fix

# Formatear código
npm run format
```

**Configuración principal:**
- 2 espacios de indentación
- Comillas simples
- Sin punto y coma al final
- Trailing comma en multiline

### Convención de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<ámbito>): <descripción>

[cuerpo opcional]

[footer opcional]
```

**Tipos permitidos:**

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `style` | Formateo (no afecta código) |
| `refactor` | Refactorización |
| `test` | Tests |
| `chore` | Mantenimiento |
| `ci` | CI/CD |

**Ámbitos comunes:**
- `brain` - Cerebro IA
- `backend` - API REST
- `infra` - Infraestructura
- `ci` - Pipelines
- `docs` - Documentación

**Ejemplos:**
```bash
feat(brain): add memory retrieval caching
fix(backend): resolve circuit breaker timeout issue
docs(api): update endpoint documentation
test(brain): add personality engine unit tests
ci(actions): add staging deployment workflow
```

### Documentación de Código

```javascript
/**
 * Procesa un mensaje a través del pipeline de decisión
 * 
 * @param {Object} message - Mensaje a procesar
 * @param {string} message.id - ID único del mensaje
 * @param {string} message.content - Contenido del mensaje
 * @param {Object} context - Contexto de la conversación
 * @returns {Promise<DecisionResult>} Resultado de la decisión
 * @throws {ValidationError} Si el mensaje es inválido
 * 
 * @example
 * const result = await brain.process({
 *   id: 'msg-123',
 *   content: 'Hola mundo'
 * }, context);
 */
async process(message, context) {
  // ...
}
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Con coverage
npm run test:coverage

# Solo backend
cd backend && npm test

# Solo brain
cd brain && npm test

# Modo watch
npm run test:watch
```

### Escribir Tests

```javascript
// test/brain/decision-maker.test.js

describe('DecisionMaker', () => {
  let decisionMaker;

  beforeEach(async () => {
    decisionMaker = await createDecisionMaker({ 
      provider: 'mock' 
    });
  });

  describe('evaluate()', () => {
    it('should return shouldRespond=true for direct questions', async () => {
      const result = await decisionMaker.evaluate({
        id: 'test-1',
        content: '¿Qué opinas de TypeScript?',
        author: 'user'
      });

      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should return shouldRespond=false for spam', async () => {
      const result = await decisionMaker.evaluate({
        id: 'test-2',
        content: 'BUY CRYPTO NOW!!!',
        author: 'spammer'
      });

      expect(result.shouldRespond).toBe(false);
    });
  });
});
```

### Cobertura Mínima

| Módulo | Cobertura Requerida |
|--------|---------------------|
| `brain/` | 70% |
| `backend/api` | 60% |
| `shared/` | 50% |

---

## 🔀 Pull Requests

### Checklist antes de crear PR

- [ ] Los tests pasan localmente (`npm test`)
- [ ] El linting pasa (`npm run lint`)
- [ ] La documentación está actualizada
- [ ] Los commits siguen la convención
- [ ] La rama está actualizada con `dev`

### Plantilla de PR

```markdown
## Descripción

Breve descripción del cambio.

## Tipo de Cambio

- [ ] Bug fix
- [ ] Nueva feature
- [ ] Breaking change
- [ ] Documentación

## Issue Relacionado

Closes #123

## Testing

- [ ] Tests unitarios agregados/actualizados
- [ ] Tests de integración verificados
- [ ] Probado manualmente

## Screenshots (si aplica)

## Notas adicionales
```

### Proceso de Review

1. **CI Check**: Los tests y linting deben pasar
2. **Code Review**: Al menos 1 aprobación requerida
3. **Merge**: Squash and merge hacia `dev`

---

## 📁 Estructura del Proyecto

```
social-llm/
├── 📁 backend/              # API REST (Node.js)
│   ├── api/                # Rutas Express
│   ├── brain/              # Cliente Brain
│   ├── shared/             # Adapters, utils
│   └── __tests__/          # Tests backend
│
├── 📁 brain/                # Cerebro IA (Node.js)
│   ├── strategies/         # Personalidad
│   ├── memory/             # RAG
│   ├── decision/           # DecisionMaker
│   └── lab/                # Experiments
│
├── 📁 infrastructure/       # IaC
│   └── terraform/          # Terraform configs
│
├── 📁 .github/              # GitHub configs
│   ├── workflows/          # CI/CD
│   └── ISSUE_TEMPLATE/     # Templates
│
├── 📁 docs/                 # Documentación
│
└── 📁 shared/               # Código compartido
```

---

## ❓ Preguntas

Si tienes preguntas sobre cómo contribuir:

1. Revisa la [documentación](./docs/)
2. Busca en [Issues existentes](https://github.com/juancordobez/social-llm/issues)
3. Abre una nueva issue con la etiqueta `question`

---

## 🏆 Reconocimientos

Todos los contribuidores serán reconocidos en el README principal.

¡Gracias por contribuir a Social Mimic! 🚀
