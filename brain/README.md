# 🧠 Brain - Cerebro de Social Mimic

El cerebro del agente autónomo. Aquí vive la lógica de IA, las estrategias de personalidad y el laboratorio de experimentación.

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
├── lab/                     # 🧪 Laboratorio de pruebas
│   ├── mock-llm.js          # LLM simulado (no consume tokens)
│   └── test-strategy.js     # Runner de tests para estrategias
│
├── core/                    # 📦 Código Python (referencia/futuro)
│   └── personality_engine.py
│
├── experiments/             # 📓 Experimentos y notebooks
└── notebooks/               # Jupyter notebooks
```

## 🚀 Probar Estrategias (Sin API)

```bash
# Ejecutar tests con Mock LLM (no consume tokens)
node brain/lab/test-strategy.js trait-scoring-v1
```

## 🎯 Estrategias Disponibles

### trait-scoring-v1 (Actual)
- **Enfoque:** Reduce personalidad a números 0-1
- **Pros:** Simple, rápido, bajo consumo
- **Contras:** Pierde matices
- **Estado:** Experimental

### Planificadas
- `few-shot-v2`: Incluir posts reales como ejemplos
- `rag-v3`: Recuperar contenido similar via embeddings

## � Uso desde Backend

```javascript
// backend/src/core/personality/index.js importa desde aquí
const PersonalityEngine = require('../../brain/strategies/trait-scoring-v1');
```

## 🧪 Laboratorio

El lab permite probar estrategias **sin conectar a APIs reales**:

```javascript
const { createMockLLM } = require('./lab/mock-llm');

// LLM simulado - respuestas predefinidas
const mockLLM = createMockLLM();
const engine = new PersonalityEngine(mockLLM);

// Probar sin gastar tokens
await engine.learn(posts);
await engine.generate({ topic: 'test' });
```

---

*Última actualización: Enero 2026*
