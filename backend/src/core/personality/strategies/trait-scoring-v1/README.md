# PersonalityEngine v1 - Estrategia de Traits Numéricos

> ⚠️ **VERSIÓN EXPERIMENTAL** - Primera iteración, sujeta a cambios

## 📋 Resumen

Esta es la **primera estrategia** para capturar y replicar personalidad.

**Enfoque:** Reducir la personalidad a valores numéricos (0-1) que describen características como formalidad, humor, entusiasmo, etc.

## 🎯 Idea Central

```
Posts de ejemplo → Análisis IA → Traits numéricos → System Prompt → Contenido generado
```

## ⚖️ Trade-offs conocidos

### ✅ Ventajas
- Simple de implementar
- Fácil de ajustar manualmente
- Bajo consumo de tokens
- Rápido de procesar

### ❌ Limitaciones
- **Pierde contexto**: Reducir texto a números elimina matices
- **Sobre-simplifica**: La personalidad humana es más compleja
- **No aprende**: No mejora con el tiempo
- **Sin memoria**: Cada generación es independiente

## 📁 Estructura de archivos

```
backend/src/core/personality/
├── index.js              # Exporta PersonalityEngine v1
├── engine.js             # Clase principal (orquestador)
├── analyzer.js           # Análisis de perfil → traits
├── generator.js          # Generación de contenido
├── prompts.js            # Templates de prompts
├── traits.js             # Schema y defaults de traits
├── scorer.js             # Evaluación de autenticidad
└── README.md             # Este archivo
```

## 🔄 Posibles iteraciones futuras

| Versión | Estrategia | Idea |
|---------|------------|------|
| **v1** (actual) | Traits numéricos | Reducir a scores 0-1 |
| v2 (idea) | Ejemplos + Traits | Guardar posts originales como referencia |
| v3 (idea) | RAG completo | Buscar posts similares para contexto |
| v4 (idea) | Fine-tuning | Entrenar modelo con datos del usuario |

## 🧪 Cómo usar

```javascript
const PersonalityEngine = require('./src/core/personality');
const Groq = require('groq-sdk');

// Crear cliente LLM
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Crear engine
const engine = new PersonalityEngine(groq);

// 1. Aprender de posts existentes
const traits = await engine.learn([
  "Me encanta programar!",
  "Nuevo proyecto de IA...",
  "La tecnología me apasiona 🚀"
], { bio: "Dev apasionado por IA" });

// 2. Generar contenido
const tweet = await engine.generate({
  type: 'post',
  topic: 'inteligencia artificial',
  platform: 'twitter'
});

// 3. Generar con evaluación
const { content, score } = await engine.generate({
  type: 'reply',
  context: 'Alguien preguntó sobre frameworks de ML',
  platform: 'twitter'
}, { withScore: true });

// 4. Evaluar contenido existente
const quality = await engine.evaluate("Mi texto...");
console.log(quality.overall); // 0-1

// 5. Guardar/cargar traits
const savedTraits = engine.exportTraits();
// ... más tarde ...
engine.loadTraits(savedTraits);
```

## 📊 Schema de Traits (v1)

```javascript
{
  tone: {
    formality: 0.0-1.0,    // casual ↔ formal
    humor: 0.0-1.0,        // serio ↔ humorístico
    enthusiasm: 0.0-1.0,   // reservado ↔ entusiasta
    empathy: 0.0-1.0       // directo ↔ empático
  },
  style: {
    verbosity: 0.0-1.0,    // conciso ↔ detallado
    complexity: 0.0-1.0,   // simple ↔ técnico
    emojiUsage: 0.0-1.0,   // ninguno ↔ frecuente
    hashtagUsage: 0.0-1.0  // mínimo ↔ abundante
  },
  topics: ["tema1", "tema2"],
  vocabulary: {
    preferredWords: ["palabras", "frecuentes"],
    catchphrases: ["frases", "características"]
  },
  confidence: 0.0-1.0      // qué tan seguro está el análisis
}
```

## 🏷️ Versionado

- **Versión:** 1.0.0
- **Estrategia:** Traits Numéricos
- **Fecha:** Enero 2026
- **Estado:** Experimental

---

*Esta documentación se actualizará cuando probemos el sistema en producción.*
