# 🔑 Guía de Credenciales - Social Mimic

## 📋 Variables de Entorno Necesarias

### 🔴 CRÍTICAS (para que funcione)

| Variable | Servicio | Cómo obtenerla |
|----------|----------|----------------|
| `GROQ_API_KEY` | Groq (LLM) | Ver sección 1 |
| `TWITTER_*` (5 vars) | Twitter API | Ver sección 2 |

### 🟡 OPCIONALES (para producción)

| Variable | Servicio | Para qué |
|----------|----------|----------|
| `SUPABASE_*` | Supabase | Base de datos (memoria persistente) |
| `UPSTASH_*` | Upstash | Cache Redis |
| `GCP_*` | Google Cloud | Deploy serverless |

---

## 🔑 Cómo Obtener las Credenciales

### 1. GROQ_API_KEY (GRATIS - Imprescindible)

1. Ve a **https://console.groq.com**
2. Crea cuenta (gratis con Google/GitHub)
3. Ve a **API Keys** → **Create API Key**
4. Copia la key

```bash
# Free tier: 30 requests/min, 6000/día
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxx"
```

---

### 2. TWITTER API (GRATIS - Para publicar)

1. Ve a **https://developer.twitter.com/en/portal/dashboard**
2. Crea cuenta de desarrollador (gratis)
3. Crea un **Project** → luego una **App**
4. En **App Settings** → **Keys and Tokens**:
   - Genera **API Key and Secret**
   - Genera **Access Token and Secret**
   - Genera **Bearer Token**

```bash
# Free tier: 1,500 tweets/mes (escritura)
TWITTER_API_KEY="xxxxxxxxxxxxxxxxxxxxxxx"
TWITTER_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWITTER_ACCESS_TOKEN="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWITTER_ACCESS_TOKEN_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWITTER_BEARER_TOKEN="AAAAAAAAAAAAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWITTER_BOT_USERNAME="tu_bot_username"
```

⚠️ **Importante:** En Twitter Developer Portal:
- Configura permisos **Read and Write**
- Regenera tokens después de cambiar permisos

---

### 3. SUPABASE (GRATIS - Para memoria)

1. Ve a **https://supabase.com**
2. Crea proyecto (gratis)
3. Ve a **Settings** → **API**
4. Copia URL y keys

```bash
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

---

### 4. UPSTASH Redis (GRATIS - Para cache)

1. Ve a **https://console.upstash.com**
2. Crea base de datos Redis (gratis)
3. Copia REST URL y Token

```bash
UPSTASH_REDIS_URL="https://xxxx-xxxx.upstash.io"
UPSTASH_REDIS_TOKEN="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ=="
```

---

## 🚀 Setup Rápido

```bash
# 1. Copia el ejemplo
cp .env.example .env

# 2. Edita y agrega tus keys
notepad .env   # o code .env

# 3. Mínimo para probar (solo Groq):
GROQ_API_KEY="tu_key_de_groq"
```

---

## 💰 Resumen de Costos

| Servicio | Tier Gratis | Límites |
|----------|-------------|---------|
| Groq | ✅ Gratis | 30 req/min, 6000/día |
| Twitter | ✅ Gratis | 1,500 tweets/mes |
| Supabase | ✅ Gratis | 500MB PostgreSQL |
| Upstash | ✅ Gratis | 10,000 commands/día |
| GCP Functions | ✅ Gratis | 2M invocaciones/mes |

**Total: $0/mes** para desarrollo y MVP
