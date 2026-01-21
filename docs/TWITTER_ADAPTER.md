# 📦 Twitter Adapter Module

> **Integración híbrida con Twitter: Lectura gratuita + Escritura API**

## 📖 Tabla de Contenidos

- [Resumen](#resumen)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Uso Rápido](#uso-rápido)
- [Componentes](#componentes)
- [API Reference](#api-reference)
- [Configuración](#configuración)
- [Troubleshooting](#troubleshooting)

---

## Resumen

Este módulo implementa una **estrategia híbrida** para interactuar con Twitter:

| Operación | Método | Costo | Límite |
|-----------|--------|-------|--------|
| **LECTURA** | Nitter (scraping) | GRATIS | Ilimitado* |
| **ESCRITURA** | Twitter API v2 | GRATIS | 1,500 tweets/mes |

\* *Sujeto a disponibilidad de instancias Nitter*

### ¿Por qué híbrido?

Twitter API **Free tier** solo permite escribir, no leer. Usamos **Nitter** (frontend alternativo open-source de Twitter) para leer tweets sin costo ni límites.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      TwitterManager                          │
│                     (Orquestador)                           │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐│
│  │   LECTURA (FREE)    │    │    ESCRITURA (API Free)     ││
│  │                     │    │                             ││
│  │  TwitterScraper     │    │    TwitterAPI               ││
│  │  ├─ Nitter proxy    │    │    ├─ OAuth 1.0a            ││
│  │  ├─ HTML parsing    │    │    ├─ Rate limiting         ││
│  │  └─ Auto-rotation   │    │    └─ 1,500/mes             ││
│  └─────────────────────┘    └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Flujo de datos

```
Usuario menciona @bot
        ↓
[Scraper] getMentions() ←── Nitter (gratis)
        ↓
[PersonalityEngine] genera respuesta
        ↓
[API] replyToTweet() ←── Twitter API (cuenta del límite)
        ↓
Tweet publicado ✓
```

---

## Instalación

El módulo ya está incluido en el proyecto. Solo necesitas configurar las variables de entorno.

### Variables requeridas (.env)

```env
# Twitter API (obtener de https://developer.twitter.com)
TWITTER_API_KEY="tu_api_key"
TWITTER_API_SECRET="tu_api_secret"
TWITTER_ACCESS_TOKEN="tu_access_token"
TWITTER_ACCESS_TOKEN_SECRET="tu_access_token_secret"
TWITTER_BEARER_TOKEN="tu_bearer_token"

# Username del bot (sin @)
TWITTER_BOT_USERNAME="tu_bot"
```

### Obtener API Keys

1. Ve a [developer.twitter.com](https://developer.twitter.com)
2. Crea un proyecto con **Free tier**
3. Genera las 4 keys + bearer token
4. Copia al archivo `.env`

---

## Uso Rápido

### Importar el módulo

```javascript
const { TwitterManager } = require('./src/adapters');

const twitter = new TwitterManager();
```

### Leer tweets (GRATIS via Nitter)

```javascript
// Tweets de un usuario
const tweets = await twitter.getUserTweets('elonmusk', 10);

// Perfil de usuario
const profile = await twitter.getUserProfile('elonmusk');

// Buscar tweets
const results = await twitter.search('inteligencia artificial', 20);

// Menciones al bot
const mentions = await twitter.getMentions(10);
```

### Escribir tweets (API - cuenta del límite)

```javascript
// Publicar tweet
await twitter.tweet('¡Hola mundo!');

// Responder a un tweet
await twitter.reply('1234567890', 'Gracias por tu comentario!');

// Like
await twitter.like('1234567890');

// Retweet
await twitter.retweet('1234567890');

// Seguir usuario
await twitter.follow('user_id_123');
```

### Operaciones combinadas

```javascript
// Analizar un usuario (perfil + tweets + stats)
const analysis = await twitter.analyzeUser('openai');
console.log(analysis.analysis.avgLikes);

// Obtener contexto de conversación
const context = await twitter.getConversationContext('user', 'tweet_id');

// Verificar si podemos twittear
if (twitter.canTweet()) {
  await twitter.tweet('Todavía tengo tweets disponibles!');
}
```

---

## Componentes

### 📁 Estructura de archivos

```
backend/src/adapters/twitter/
├── index.js      # Punto de entrada
├── config.js     # Configuración y constantes
├── parser.js     # Parser de HTML de Nitter
├── oauth.js      # Generador OAuth 1.0a
├── scraper.js    # Lectura via Nitter
├── api.js        # Escritura via Twitter API
└── manager.js    # Orquestador
```

### Descripción de cada archivo

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `config.js` | ~40 | Instancias Nitter, timeouts, límites API |
| `parser.js` | ~80 | Extraer tweets/perfiles del HTML de Nitter |
| `oauth.js` | ~50 | Generar firma HMAC-SHA1 para Twitter API |
| `scraper.js` | ~100 | Clase `TwitterScraperAdapter` |
| `api.js` | ~150 | Clase `TwitterAPIAdapter` |
| `manager.js` | ~150 | Clase `TwitterManager` |

---

## API Reference

### TwitterManager

```javascript
const twitter = new TwitterManager(config?)
```

#### Métodos de Lectura (Gratis)

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `getUserTweets(username, limit?)` | string, number | Tweet[] | Tweets de un usuario |
| `getUserProfile(username)` | string | Profile | Perfil de usuario |
| `search(query, limit?)` | string, number | Tweet[] | Buscar tweets |
| `getMentions(limit?)` | number | Tweet[] | Menciones al bot |
| `getReplies(username, tweetId)` | string, string | {original, replies} | Hilo de respuestas |
| `analyzeUser(username)` | string | Analysis | Análisis completo |
| `getConversationContext(username, tweetId)` | string, string | Context | Contexto para IA |

#### Métodos de Escritura (API)

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `tweet(text)` | string | Result | Publicar tweet |
| `reply(tweetId, text)` | string, string | Result | Responder tweet |
| `like(tweetId)` | string | Result | Dar like |
| `retweet(tweetId)` | string | Result | Retweetear |
| `follow(userId)` | string | Result | Seguir usuario |
| `deleteTweet(tweetId)` | string | Result | Eliminar tweet |

#### Métodos de Utilidad

| Método | Retorna | Descripción |
|--------|---------|-------------|
| `canTweet()` | boolean | ¿Hay tweets disponibles? |
| `getRateLimitStatus()` | RateLimit | Estado del límite mensual |
| `healthCheck()` | Health | Estado de conexiones |
| `markAsProcessed(tweetId)` | void | Marcar tweet como procesado |
| `getUnprocessedMentions(limit?)` | Tweet[] | Menciones no procesadas |

### Tipos de datos

```typescript
interface Tweet {
  id: string;
  username: string;
  content: string;
  timestamp: string | null;
  stats: {
    replies: number;
    retweets: number;
    likes: number;
  };
  url: string | null;
}

interface Profile {
  username: string;
  name: string;
  bio: string;
  posts: string;
  followers: string;
  following: string;
}

interface RateLimit {
  used: number;
  limit: number;        // 1500
  remaining: number;
  percentUsed: string;
}

interface Health {
  overall: boolean;
  scraper: { ok: boolean; message: string; instance?: string };
  api: { ok: boolean; message: string; user?: object; rateLimit?: RateLimit };
  capabilities: {
    canRead: boolean;
    canWrite: boolean;
    monthlyTweetsRemaining: number;
  };
}
```

---

## Configuración

### Instancias Nitter

En `config.js` puedes modificar las instancias de Nitter:

```javascript
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.cz',
  'https://nitter.unixfox.eu',
  // Agregar más si alguna falla...
];
```

Si todas las instancias fallan, consulta [esta lista actualizada](https://github.com/zedeus/nitter/wiki/Instances).

### Timeouts y reintentos

```javascript
const DEFAULT_CONFIG = {
  scraper: {
    timeout: 10000,  // 10 segundos
    retries: 3,      // 3 intentos
  },
  api: {
    monthlyLimit: 1500,  // Free tier
  },
};
```

---

## Troubleshooting

### "All Nitter instances failed"

**Causa:** Las instancias públicas de Nitter están caídas o bloqueadas.

**Solución:**
1. Verifica [esta lista](https://github.com/zedeus/nitter/wiki/Instances) de instancias activas
2. Actualiza `NITTER_INSTANCES` en `config.js`
3. Considera levantar tu propia instancia Nitter

### "Credenciales no configuradas"

**Causa:** Faltan variables de entorno de Twitter API.

**Solución:**
1. Verifica que exista `.env` con todas las variables
2. Asegúrate de que `dotenv` esté cargado antes de usar el módulo

### "Límite mensual alcanzado"

**Causa:** Usaste los 1,500 tweets del mes.

**Solución:**
- Espera al próximo mes (se resetea automáticamente)
- O crea otra cuenta de desarrollador Twitter

### "Twitter API Error 401/403"

**Causa:** Tokens inválidos o permisos insuficientes.

**Solución:**
1. Regenera los tokens en developer.twitter.com
2. Verifica que la app tenga permisos de lectura Y escritura
3. Asegúrate de usar OAuth 1.0a User Context (no App-Only)

---

## CLI de Prueba

El proyecto incluye un script CLI para probar:

```bash
# Probar conexiones
node backend/scripts/twitter-bot.js test

# Ver menciones
node backend/scripts/twitter-bot.js mentions

# Analizar usuario
node backend/scripts/twitter-bot.js analyze @elonmusk

# Publicar tweet
node backend/scripts/twitter-bot.js tweet "Hola mundo!"

# Iniciar bot (modo prueba)
node backend/scripts/twitter-bot.js start --dry

# Iniciar bot (producción)
node backend/scripts/twitter-bot.js start
```

---

## Recursos

- [Twitter API v2 Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Nitter Project](https://github.com/zedeus/nitter)
- [Lista de instancias Nitter](https://github.com/zedeus/nitter/wiki/Instances)
- [OAuth 1.0a Spec](https://oauth.net/1/)

---

*Última actualización: Enero 2026*
