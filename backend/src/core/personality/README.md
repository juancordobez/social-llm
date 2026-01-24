# PersonalityEngine - Proxy

Este módulo **re-exporta** las estrategias de personalidad desde `brain/strategies/`.

## Uso

```javascript
const PersonalityEngine = require('./core/personality');
const engine = new PersonalityEngine(llmClient);
```

## Ubicación Real del Código

El código de las estrategias vive en:
```
brain/strategies/trait-scoring-v1/
```

Este archivo (`index.js`) es solo un selector/proxy que importa desde brain.

## ¿Por qué esta separación?

- **brain/** = Lógica de IA, estrategias, experimentación
- **backend/** = API, servicios, integraciones

Así podemos experimentar con estrategias en `brain/lab/` sin afectar la API.
